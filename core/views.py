import datetime
import os
from django.shortcuts import render
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.contrib.auth.hashers import make_password, check_password

from .models import Plan, Customer, SystemSetting, WhatsAppLog, Transaction
from .serializers import PlanSerializer, CustomerSerializer, SystemSettingSerializer, WhatsAppLogSerializer, TransactionSerializer
from .whatsapp_service import WhatsAppService
from .queue_service import WhatsAppQueueManager

class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all().order_by('-created_at')
    serializer_class = PlanSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('expiry_date')
    serializer_class = CustomerSerializer

    # Search and Filter
    def get_queryset(self):
        queryset = Customer.objects.all().order_by('expiry_date')
        
        # Search by name, phone
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(phone_number__icontains=search))
            
        # Filter by payment status
        is_paid = self.request.query_params.get('is_paid', None)
        if is_paid is not None:
            is_paid_bool = is_paid.lower() == 'true'
            queryset = queryset.filter(is_paid=is_paid_bool)
            
        return queryset

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """
        Marks a customer as paid, pushes their activation date to today,
        recalculates their next expiry date, generates a Transaction log,
        and enqueues the WhatsApp Receipt.
        """
        customer = self.get_object()
        message_style = request.data.get('message_style', 'video_receipt')
        
        # 1. Update dates and status
        customer.is_paid = True
        customer.activation_date = datetime.date.today()
        # Custom save will automatically recalculate customer.expiry_date and trigger Transaction logging
        customer.save()
        
        # 2. Trigger WhatsApp receipt message in background queue
        msg_info = "Skipped sending message."
        if message_style in ['video_receipt', 'text_receipt']:
            msg_content = f"Payment received confirmation. Style: {message_style}. New expiry: {customer.expiry_date}"
            
            # Create a PENDING log
            log = WhatsAppLog.objects.create(
                customer=customer,
                message_type='RECEIPT',
                message_content=msg_content,
                language=customer.language_preference,
                status='PENDING'
            )
            
            # Queue the message sequentially
            WhatsAppQueueManager().enqueue_message(log.id, 'RECEIPT', message_style)
            msg_info = f"Receipt message ({message_style}) successfully queued."
            
        return Response({
            'status': 'success',
            'message': f"Customer marked as Paid. {msg_info}",
            'customer': CustomerSerializer(customer).data
        })

    @action(detail=True, methods=['post'])
    def mark_unpaid(self, request, pk=None):
        """
        Manually marks a customer as unpaid (e.g. at the start of a billing cycle).
        """
        customer = self.get_object()
        customer.is_paid = False
        customer.save()
        return Response({
            'status': 'success',
            'message': "Customer marked as Unpaid.",
            'customer': CustomerSerializer(customer).data
        })

    @action(detail=True, methods=['post'])
    def send_reminder(self, request, pk=None):
        """
        Manually triggers and queues a WhatsApp due reminder for this customer.
        Supports message_style: 'video_reminder', 'text_reminder', 'deactivation_warning', 'upi_qr_reminder'
        """
        customer = self.get_object()
        message_style = request.data.get('message_style', 'video_reminder')
        
        msg_content = f"Due reminder sent manually. Style: {message_style}."
        
        # Create a PENDING log
        log = WhatsAppLog.objects.create(
            customer=customer,
            message_type='REMINDER',
            message_content=msg_content,
            language=customer.language_preference,
            status='PENDING'
        )
        
        # Queue the message sequentially
        WhatsAppQueueManager().enqueue_message(log.id, 'REMINDER', message_style)
        
        return Response({
            'status': 'success',
            'message': f"Reminder message ({message_style}) queued successfully in background."
        })

    @action(detail=True, methods=['post'])
    def send_custom_message(self, request, pk=None):
        """
        Sends and queues a manual, customized message typed by the admin.
        """
        customer = self.get_object()
        message_text = request.data.get('message', '').strip()
        
        if not message_text:
            return Response({'error': 'Message text is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create a PENDING log
        log = WhatsAppLog.objects.create(
            customer=customer,
            message_type='CUSTOM',
            message_content=message_text,
            language=customer.language_preference,
            status='PENDING'
        )
        
        # Queue the message sequentially
        WhatsAppQueueManager().enqueue_message(log.id, 'CUSTOM')
        
        return Response({
            'status': 'success',
            'message': "Custom message queued successfully in background."
        })

    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """
        Fetches the complete historical transaction list for this customer.
        """
        customer = self.get_object()
        txs = customer.transactions.all().order_by('-created_at')
        serializer = TransactionSerializer(txs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def history_image(self, request, pk=None):
        """
        Generates the premium transaction history image on-the-fly and returns it as a file response.
        """
        customer = self.get_object()
        
        # Build the dynamic statement PNG via Pillow
        image_path = WhatsAppService.generate_history_image(customer)
        
        if not image_path or not os.path.exists(image_path):
            return Response({'error': 'Failed to generate history statement image'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        response = FileResponse(open(image_path, 'rb'), content_type='image/png')
        safe_name = "".join([c for c in customer.name if c.isalnum() or c == ' ']).strip().replace(" ", "_")
        response['Content-Disposition'] = f'attachment; filename="statement_{safe_name}.png"'
        return response

    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """
        Updates the customer's portal password.
        """
        customer = self.get_object()
        new_password = request.data.get('new_password', '').strip()
        
        if not new_password:
            return Response({'error': 'Password cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
            
        customer.password = new_password
        customer.save()
        
        return Response({
            'status': 'success',
            'message': 'Password successfully changed!'
        })

    @action(detail=True, methods=['post'])
    def file_complaint(self, request, pk=None):
        """
        Accepts ticket issues, saves uploader image temporarily, triggers load-balanced queue notification.
        """
        customer = self.get_object()
        problem_type = request.data.get('problem_type', 'Other').strip()
        details = request.data.get('details', '').strip()
        image_file = request.FILES.get('image', None)
        
        temp_path = None
        if image_file:
            import uuid
            from django.conf import settings
            
            # Create complaints temp directory
            complaints_dir = os.path.join(settings.MEDIA_ROOT, 'complaints')
            os.makedirs(complaints_dir, exist_ok=True)
            
            ext = os.path.splitext(image_file.name)[1] or '.png'
            temp_filename = f"temp_complaint_{customer.id.hex[:10]}_{uuid.uuid4().hex[:10]}{ext}"
            temp_path = os.path.join(complaints_dir, temp_filename)
            
            # Save temporary uploader content
            with open(temp_path, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)
                    
        # Notification text body sent to operator
        notification_text = (
            f"🚨 *NEW CABLE SUPPORT TICKET* 🚨\n\n"
            f"👤 *Customer*: {customer.name}\n"
            f"📞 *Mobile*: {customer.phone_number or 'No Number/Smart Device'}\n"
            f"📍 *Location*: Siaria, Siaria Bada Sahi\n"
            f"📦 *Active Package*: {customer.plan.name if customer.plan else 'Custom Active Package'}\n\n"
            f"⚠️ *Issue Description*: {problem_type}\n"
            f"💬 *Operator Details / Notes*: {details or 'No additional details provided.'}\n\n"
            f"Please address this complaint immediately!"
        )
        
        # Log complaint tracking entry under customer details
        log = WhatsAppLog.objects.create(
            customer=customer,
            message_type='CUSTOM',
            message_content=notification_text,
            language=customer.language_preference,
            status='PENDING'
        )
        
        # Sequential asynchronous queue dispatch
        from core.queue_service import WhatsAppQueueManager
        extra_data = {
            'target_phone': '+919777546420', # Laxmidhara Sahoo
            'media_path': temp_path
        }
        WhatsAppQueueManager().enqueue_message(log.id, 'COMPLAINT', extra_data=extra_data)
        
        return Response({
            'status': 'success',
            'message': 'Complaint successfully enqueued! Operator Laxmidhara Sahoo will be notified instantly.'
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Aggregates dashboard statistics for quick visual metrics.
        """
        total_customers = Customer.objects.count()
        paid_customers = Customer.objects.filter(is_paid=True).count()
        unpaid_customers = Customer.objects.filter(is_paid=False).count()
        
        uncollected_revenue = 0
        collected_revenue = 0
        
        for c in Customer.objects.all():
            price = c.price_override if c.price_override is not None else (c.plan.price if c.plan else 0)
            if c.is_paid:
                collected_revenue += price
            else:
                uncollected_revenue += price
                
        today = datetime.date.today()
        expiring_soon = Customer.objects.filter(
            expiry_date__lte=today + datetime.timedelta(days=3),
            expiry_date__gte=today,
            is_paid=True
        ).count()
        
        expired_count = Customer.objects.filter(
            expiry_date__lt=today,
            is_paid=True
        ).count()

        return Response({
            'total_customers': total_customers,
            'paid_customers': paid_customers,
            'unpaid_customers': unpaid_customers,
            'collected_revenue': float(collected_revenue),
            'uncollected_revenue': float(uncollected_revenue),
            'expiring_soon_count': expiring_soon,
            'expired_count': expired_count,
        })

class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer

class WhatsAppLogViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppLogSerializer

    def get_queryset(self):
        # Automatically prune logs older than 3 days
        from django.utils import timezone
        threshold = timezone.now() - datetime.timedelta(days=3)
        WhatsAppLog.objects.filter(sent_at__lt=threshold).delete()
        return WhatsAppLog.objects.all().order_by('-sent_at')

@api_view(['POST'])
@permission_classes([AllowAny])
def auth_login(request):
    """
    Authenticates operator admin or customer.
    Admin checks settings password, Customer searches for phone matches and checks last 4 digits.
    """
    role = request.data.get('role')
    password = request.data.get('password')
    
    if not role or not password:
        return Response({'error': 'Role and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
    if role == 'admin':
        try:
            setting = SystemSetting.objects.get(key='admin_password')
            hashed_pwd = setting.value
        except SystemSetting.DoesNotExist:
            # Default password is 'admin'
            hashed_pwd = make_password('admin')
            SystemSetting.objects.create(key='admin_password', value=hashed_pwd)
            
        if check_password(password, hashed_pwd):
            return Response({
                'status': 'success',
                'role': 'admin',
                'token': 'admin-session-token-mock'
            })
        else:
            return Response({'error': 'Invalid admin password'}, status=status.HTTP_401_UNAUTHORIZED)
            
    elif role == 'customer':
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({'error': 'Phone number is required for customer login'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Clean phone digits to search for matching records
        input_digits = "".join([c for c in phone_number if c.isdigit()])
        if not input_digits:
            return Response({'error': 'Invalid phone number format'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Find customer matching the digits suffix or prefix
        target_customer = None
        for customer in Customer.objects.all():
            if not customer.phone_number:
                continue
            cust_digits = "".join([c for c in customer.phone_number if c.isdigit()])
            if cust_digits.endswith(input_digits) or input_digits.endswith(cust_digits):
                target_customer = customer
                break
                
        if not target_customer:
            return Response({'error': 'No customer found matching this phone number'}, status=status.HTTP_404_NOT_FOUND)
            
        # Check custom password if set, otherwise fallback to last 4 digits of phone
        if target_customer.password:
            is_valid_pwd = password == target_customer.password
        else:
            cust_phone_digits = "".join([c for c in target_customer.phone_number if c.isdigit()]) if target_customer.phone_number else ""
            last_4 = cust_phone_digits[-4:] if len(cust_phone_digits) >= 4 else cust_phone_digits
            is_valid_pwd = password == last_4
        
        if is_valid_pwd:
            return Response({
                'status': 'success',
                'role': 'customer',
                'customerId': target_customer.id,
                'customer': CustomerSerializer(target_customer).data,
                'token': f'customer-session-{target_customer.id.hex}-mock'
            })
        else:
            hint = "Invalid password." if target_customer.password else "Invalid password. Hint: Default password is the last 4 digits of your phone number."
            return Response({'error': hint}, status=status.HTTP_401_UNAUTHORIZED)
            
    else:
        return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def auth_change_password(request):
    """
    Updates the admin password setting.
    """
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not old_password or not new_password:
        return Response({'error': 'Old password and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        setting = SystemSetting.objects.get(key='admin_password')
        hashed_pwd = setting.value
    except SystemSetting.DoesNotExist:
        hashed_pwd = make_password('admin')
        setting = SystemSetting.objects.create(key='admin_password', value=hashed_pwd)
        
    if check_password(old_password, hashed_pwd):
        setting.value = make_password(new_password)
        setting.save()
        return Response({'status': 'success', 'message': 'Admin password updated successfully'})
    else:
        return Response({'error': 'Incorrect old password'}, status=status.HTTP_400_BAD_REQUEST)
