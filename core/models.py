import uuid
from django.db import models
from datetime import timedelta

class Plan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Rs. {self.price} - {self.duration_days} Days)"

class Customer(models.Model):
    LANGUAGE_CHOICES = [
        ('EN', 'English'),
        ('OD', 'Odia'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=15)  # E.g. +919876543210
    plan = models.ForeignKey(Plan, null=True, blank=True, on_delete=models.SET_NULL, related_name='customers')
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
            self.expiry_date = self.activation_date + timedelta(days=self.plan.duration_days)

        super().save(*args, **kwargs)

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
