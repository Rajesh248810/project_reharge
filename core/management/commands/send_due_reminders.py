import datetime
from django.core.management.base import BaseCommand
from core.models import Customer, WhatsAppLog
from core.whatsapp_service import WhatsAppService

class Command(BaseCommand):
    help = 'Scans the customer database and automatically sends due reminders for plans expiring soon.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('[DAILY CRON] Scanning database for upcoming subscription dues...'))
        
        today = datetime.date.today()
        all_customers = Customer.objects.all()
        reminders_sent = 0
        
        for customer in all_customers:
            # Skip if they are already marked unpaid (no need to send standard pre-expiry warning if already deactivated)
            if not customer.is_paid:
                continue
                
            # If customer has a specific expiry date
            if customer.expiry_date:
                # Calculate target date: if expiry date is exactly X days from today
                reminder_lead = customer.reminder_days_before
                target_date = today + datetime.timedelta(days=reminder_lead)
                
                if customer.expiry_date == target_date:
                    self.stdout.write(self.style.WARNING(
                        f"Customer {customer.name} (Phone: {customer.phone_number}) is expiring on {customer.expiry_date} "
                        f"({reminder_lead} days left). Triggering automated WhatsApp due reminder..."
                    ))
                    
                    # Send due reminder video + text via WhatsAppService
                    success, msg = WhatsAppService.send_due_reminder(customer)
                    
                    # Log the auto action in the database
                    WhatsAppLog.objects.create(
                        customer=customer,
                        message_type='REMINDER',
                        message_content=f"[SYSTEM AUTO-REMINDER] Due warning sent automatically.",
                        language=customer.language_preference,
                        status='SENT' if success else 'FAILED',
                        error_message=None if success else msg
                    )
                    
                    if success:
                        reminders_sent += 1
                        self.stdout.write(self.style.SUCCESS(f"Reminder delivered successfully for {customer.name}!"))
                    else:
                        self.stdout.write(self.style.ERROR(f"Failed to deliver reminder for {customer.name}: {msg}"))

        self.stdout.write(self.style.SUCCESS(f"[DAILY CRON] Scan complete. Total automated due reminders sent today: {reminders_sent}"))
