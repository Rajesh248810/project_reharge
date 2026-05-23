from rest_framework import serializers
from .models import Plan, Customer, SystemSetting, WhatsAppLog, Transaction

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    plan_details = PlanSerializer(source='plan', read_only=True)
    plan = serializers.PrimaryKeyRelatedField(
        queryset=Plan.objects.all(),
        required=False,
        allow_null=True
    )
    days_left = serializers.SerializerMethodField()
    transactions = TransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone_number', 'plan', 'plan_details',
            'price_override', 'activation_date', 'expiry_date',
            'is_paid', 'language_preference', 'reminder_days_before',
            'days_left', 'transactions', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_days_left(self, obj):
        import datetime
        if obj.expiry_date:
            today = datetime.date.today()
            delta = obj.expiry_date - today
            return delta.days
        return 0

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'

class WhatsAppLogSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = WhatsAppLog
        fields = [
            'id', 'customer', 'customer_name', 'message_type',
            'message_content', 'language', 'video_path',
            'sent_at', 'status', 'error_message'
        ]
        read_only_fields = ['sent_at']
