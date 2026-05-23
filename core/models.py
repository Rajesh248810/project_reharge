import uuid
from django.db import models
from datetime import timedelta

class Village(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Plan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30)
    channels = models.TextField(blank=True, null=True, help_text="Comma-separated list of channels included in this plan")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Rs. {self.price} - {self.duration_days} Days)"

import calendar
import datetime

def calculate_expiry_date(activation_date, duration_days):
    """
    Computes date-wise expiry date by adding exact months if the duration 
    is a multiple of 30 days (standard monthly billing), otherwise adds exact days.
    Clamps day bounds for shorter target months (e.g. Jan 31 + 1 month -> Feb 28).
    """
    if duration_days % 30 == 0:
        months_to_add = duration_days // 30
        month = activation_date.month - 1 + months_to_add
        year = activation_date.year + month // 12
        month = month % 12 + 1
        day = min(activation_date.day, calendar.monthrange(year, month)[1])
        return datetime.date(year, month, day)
    else:
        return activation_date + datetime.timedelta(days=duration_days)

class Customer(models.Model):
    LANGUAGE_CHOICES = [
        ('EN', 'English'),
        ('OD', 'Odia'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=15, blank=True, null=True)  # E.g. +919876543210
    password = models.CharField(max_length=128, blank=True, null=True, help_text="Custom portal password. Fallback is last 4 digits of phone")
    plan = models.ForeignKey(Plan, null=True, blank=True, on_delete=models.SET_NULL, related_name='customers')
    village = models.ForeignKey(Village, null=True, blank=True, on_delete=models.SET_NULL, related_name='customers')
    setup_box_number = models.CharField(max_length=100, blank=True, null=True, help_text="Setup box serial/device number")
    setup_box_brand = models.CharField(max_length=100, blank=True, null=True, help_text="Setup box brand/model name")
    price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Custom price if different from plan price")
    activation_date = models.DateField()
    expiry_date = models.DateField(blank=True, null=True)
    is_paid = models.BooleanField(default=True)
    language_preference = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default='EN')
    reminder_days_before = models.IntegerField(default=2, help_text="Number of days before expiry to send reminder")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Clean phone number: keep only digits and prepend +91 for 10-digit Indian numbers
        if self.phone_number:
            digits = "".join([c for c in self.phone_number if c.isdigit()])
            if len(digits) == 10:
                self.phone_number = f"+91{digits}"
            elif len(digits) == 12 and digits.startswith("91"):
                self.phone_number = f"+{digits}"
            elif not self.phone_number.startswith("+") and digits:
                self.phone_number = f"+{digits}"

        is_new = self._state.adding
        activation_changed = False
        is_paid_changed_to_true = False

        if not is_new:
            try:
                orig = Customer.objects.get(pk=self.pk)
                activation_changed = orig.activation_date != self.activation_date
                is_paid_changed_to_true = (not orig.is_paid) and self.is_paid
                # If plan changed, also trigger recalculation
                plan_changed = orig.plan_id != self.plan_id
                if plan_changed:
                    activation_changed = True
            except Customer.DoesNotExist:
                pass
        else:
            activation_changed = True

        # Calculate expiry_date if new, if it's null, or if activation date/plan/payment toggled to paid
        if (is_new or not self.expiry_date or activation_changed or is_paid_changed_to_true) and self.activation_date and self.plan:
            self.expiry_date = calculate_expiry_date(self.activation_date, self.plan.duration_days)

        super().save(*args, **kwargs)

        if is_new and self.phone_number:
            from django.apps import apps
            WhatsAppLogModel = apps.get_model('core', 'WhatsAppLog')
            from core.queue_service import WhatsAppQueueManager
            
            log = WhatsAppLogModel.objects.create(
                customer=self,
                message_type='GREETING',
                message_content="Auto-generated welcome greeting",
                language=self.language_preference,
                status='PENDING'
            )
            WhatsAppQueueManager().enqueue_message(log.id, 'GREETING')

        if is_paid_changed_to_true or (is_new and self.is_paid):
            price = self.price_override if self.price_override is not None else (self.plan.price if self.plan else 0)
            plan_name = self.plan.name if self.plan else "Custom Active Package"
            
            import datetime
            act_date = self.activation_date if self.activation_date else datetime.date.today()
            exp_date = self.expiry_date if self.expiry_date else act_date
            
            Transaction.objects.create(
                customer=self,
                plan_name=plan_name,
                amount=price,
                activation_date=act_date,
                expiry_date=exp_date
            )

    def __str__(self):
        return f"{self.name} - {self.phone_number} ({'Paid' if self.is_paid else 'Unpaid'})"

class SystemSetting(models.Model):
    key = models.CharField(max_length=100, primary_key=True)
    value = models.TextField()

    def __str__(self):
        return f"{self.key}: {self.value}"

class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='transactions')
    plan_name = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField(auto_now_add=True)
    activation_date = models.DateField()
    expiry_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tx {self.amount} for {self.customer.name} on {self.payment_date}"

class WhatsAppLog(models.Model):
    MESSAGE_TYPES = [
        ('REMINDER', 'Due Reminder'),
        ('RECEIPT', 'Payment Receipt'),
        ('CUSTOM', 'Custom Message'),
        ('GREETING', 'Welcome Greeting'),
    ]
    STATUS_CHOICES = [
        ('SENT', 'Sent Successfully'),
        ('FAILED', 'Failed'),
        ('PENDING', 'Pending Send'),
        ('SENDING', 'Sending...'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='logs')
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES)
    message_content = models.TextField()
    language = models.CharField(max_length=2, default='EN')
    video_path = models.CharField(max_length=500, blank=True, null=True, help_text="Path to the rendered Remotion MP4 video receipt/reminder")
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.message_type} to {self.customer.name} - {self.status} on {self.sent_at.strftime('%Y-%m-%d %H:%M')}"
