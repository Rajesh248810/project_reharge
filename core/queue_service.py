import queue
import threading
import time
import logging

logger = logging.getLogger(__name__)

class WhatsAppQueueManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super(WhatsAppQueueManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.queue = queue.Queue()
        self.worker_thread = None
        self.should_stop = False
        self._initialized = True

    def start_worker(self):
        if self.worker_thread and self.worker_thread.is_alive():
            return
        self.should_stop = False
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()
        logger.info("[QUEUE SERVICE] Sequential background worker thread started successfully.")

    def enqueue_message(self, log_id, action_type, style=None):
        """
        Enqueues a message for background dispatch.
        log_id: UUID of the WhatsAppLog object
        action_type: 'RECEIPT', 'REMINDER', or 'CUSTOM'
        style: the style parameter (e.g. 'video_reminder', 'text_receipt')
        """
        task = {
            'log_id': log_id,
            'action_type': action_type,
            'style': style
        }
        self.queue.put(task)
        logger.info(f"[QUEUE SERVICE] Enqueued task: {task}. Queue size: {self.queue.qsize()}")

    def _worker_loop(self):
        # We import Django models here so they are loaded properly when the thread starts
        from core.models import WhatsAppLog
        from core.whatsapp_service import WhatsAppService
        from django.db import close_old_connections

        while not self.should_stop:
            try:
                task = self.queue.get(timeout=1.0)
            except queue.Empty:
                continue

            log_id = task['log_id']
            action_type = task['action_type']
            style = task['style']

            logger.info(f"[QUEUE SERVICE] Processing task: {task}")
            
            try:
                # Close stale or obsolete database connections to prevent InterfaceError/OperationalError
                close_old_connections()
                
                # 1. Fetch Log and update status to SENDING
                try:
                    log = WhatsAppLog.objects.get(pk=log_id)
                except WhatsAppLog.DoesNotExist:
                    logger.error(f"[QUEUE SERVICE] Log {log_id} not found in database. Skipping task.")
                    self.queue.task_done()
                    continue

                log.status = 'SENDING'
                log.save()

                customer = log.customer
                success = False
                msg = "Unknown action or style"

                # 2. Invoke WhatsApp dispatch based on action_type & style
                if action_type == 'RECEIPT':
                    if style == 'video_receipt':
                        success, msg = WhatsAppService.send_payment_receipt(customer)
                    else:
                        success, msg = WhatsAppService.send_text_receipt(customer)
                elif action_type == 'REMINDER':
                    if style == 'video_reminder':
                        success, msg = WhatsAppService.send_due_reminder(customer)
                    elif style == 'text_reminder':
                        success, msg = WhatsAppService.send_text_reminder(customer)
                    elif style == 'deactivation_warning':
                        success, msg = WhatsAppService.send_deactivation_alert(customer)
                    elif style == 'upi_qr_reminder':
                        success, msg = WhatsAppService.send_upi_qr_reminder(customer)
                    else:
                        success, msg = WhatsAppService.send_due_reminder(customer)
                elif action_type == 'CUSTOM':
                    success, msg = WhatsAppService.send_custom_text(customer, log.message_content)

                # 3. Update log status based on dispatch result
                log.status = 'SENT' if success else 'FAILED'
                log.error_message = None if success else msg
                
                # If a compiled receipt/reminder video path was returned, extract and save it
                if success and "Compiled:" in msg:
                    try:
                        # Extract string between 'Compiled: ' and ')'
                        parts = msg.split("Compiled: ")
                        if len(parts) > 1:
                            path_part = parts[1].split(")")[0].strip()
                            log.video_path = path_part
                    except Exception as parse_err:
                        logger.error(f"[QUEUE SERVICE] Failed to parse video path: {parse_err}")

                log.save()
                logger.info(f"[QUEUE SERVICE] Task completed for Log {log_id}. Status: {log.status}. Message: {msg}")

            except Exception as e:
                logger.exception(f"[QUEUE SERVICE] Unhandled error while processing task {task}: {str(e)}")
                try:
                    close_old_connections()
                    log = WhatsAppLog.objects.get(pk=log_id)
                    log.status = 'FAILED'
                    log.error_message = f"Queue Worker Error: {str(e)}"
                    log.save()
                except Exception:
                    pass

            finally:
                self.queue.task_done()
                # Brief sleep between operations to ensure smooth sequential delivery
                time.sleep(1.5)

