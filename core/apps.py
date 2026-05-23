from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        import os
        import sys
        
        # Skip spawning threads during database migrations or tests
        if any(cmd in sys.argv for cmd in ['migrate', 'makemigrations', 'test', 'showmigrations']):
            return

        # Avoid double-launching worker threads in Django hot-reload development mode
        if os.environ.get('RUN_MAIN') != 'true' and 'runserver' in sys.argv:
            return

        try:
            from .queue_service import WhatsAppQueueManager
            from .models import WhatsAppLog
            from django.db import close_old_connections
            
            # Reset stale connections before starting
            close_old_connections()
            
            manager = WhatsAppQueueManager()
            manager.start_worker()

            # Automatically recover and re-enqueue any logs stuck in PENDING or SENDING status
            stuck_logs = WhatsAppLog.objects.filter(status__in=['PENDING', 'SENDING']).order_by('sent_at')
            count = stuck_logs.count()
            if count > 0:
                print(f"[CORE CONFIG] Found {count} stuck WhatsApp messages. Re-enqueuing into sequential queue...")
                for log in stuck_logs:
                    style = None
                    if log.message_type == 'REMINDER':
                        if 'upi_qr_reminder' in log.message_content:
                            style = 'upi_qr_reminder'
                        elif 'deactivation_warning' in log.message_content:
                            style = 'deactivation_warning'
                        elif 'video_reminder' in log.message_content:
                            style = 'video_reminder'
                        else:
                            style = 'text_reminder'
                    elif log.message_type == 'RECEIPT':
                        if 'video_receipt' in log.message_content:
                            style = 'video_receipt'
                        else:
                            style = 'text_receipt'
                    
                    # Reset status to PENDING so the worker begins processing freshly
                    log.status = 'PENDING'
                    log.save()
                    
                    manager.enqueue_message(log.id, log.message_type, style)
                    
        except Exception as e:
            print(f"[CORE CONFIG] Failed to boot WhatsApp Queue Worker or recover logs: {e}")

