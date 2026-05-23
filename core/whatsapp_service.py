import os
import sys
import subprocess
import requests
import datetime
from pathlib import Path
from django.conf import settings

# Force console streams to use UTF-8 to prevent charmap UnicodeEncodeErrors on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass


class WhatsAppService:
    @staticmethod
    def render_video(composition, name, price, date, lang):
        """
        Executes Node CLI to trigger the Remotion Video rendering engine.
        Returns the absolute path to the generated MP4 file.
        """
        base_dir = Path(settings.BASE_DIR)
        renderer_dir = base_dir / 'video_renderer'
        
        # Ensure media renders directory exists
        renders_dir = base_dir / 'media' / 'renders'
        os.makedirs(renders_dir, exist_ok=True)
        
        # Generate a unique output file name
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        safe_name = "".join([c for c in name if c.isalnum()]).lower()[:10]
        out_filename = f"{composition.lower()}_{safe_name}_{timestamp}.mp4"
        out_path = renders_dir / out_filename
        
        print(f"[REMOTION ENGINE] Rendering {composition} for {name}...")
        
        # Command line arguments for node render.js
        cmd = [
            'node',
            'render.js',
            f'--composition={composition}',
            f'--name={name}',
            f'--price={price}',
            f'--date={date}',
            f'--lang={lang}',
            f'--out={out_path.resolve()}'
        ]
        
        try:
            # Execute subprocess inside the video_renderer directory
            result = subprocess.run(
                cmd,
                cwd=str(renderer_dir.resolve()),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                encoding='utf-8',
                check=True
            )
            print(f"[REMOTION ENGINE] Successfully compiled MP4: {out_path.name}")
            return str(out_path.resolve()), None
        except subprocess.CalledProcessError as e:
            error_msg = f"Remotion compile failed. Stdout: {e.stdout}. Stderr: {e.stderr}"
            print(f"[REMOTION ERROR] {error_msg}")
            return None, error_msg
        except Exception as e:
            error_msg = f"Unknown renderer exception: {str(e)}"
            print(f"[REMOTION ERROR] {error_msg}")
            return None, error_msg

    @staticmethod
    def send_to_openclaw(phone_number, text, media_path=None):
        """
        Sends message to OpenClaw local WhatsApp gateway.
        Falls back to mock simulation successfully if gateway is offline.
        """
        if not phone_number or not str(phone_number).strip():
            print("[OPENCLAW GATEWAY] Skipped sending: Customer does not have a registered mobile/WhatsApp number.")
            return False, "Skipped: Customer does not have a registered mobile/WhatsApp number."

        api_url = os.getenv('OPENCLAW_API_URL', 'http://localhost:18789/api')
        api_key = os.getenv('OPENCLAW_API_KEY', '')
        
        headers = {
            'Authorization': f'Bearer {api_key}' if api_key else '',
        }
        
        payload = {
            'phone': phone_number,
            'message': text,
        }
        
        files = {}
        if media_path and os.path.exists(media_path):
            mime_type = 'video/mp4'
            if str(media_path).lower().endswith('.png'):
                mime_type = 'image/png'
            elif str(media_path).lower().endswith('.jpg') or str(media_path).lower().endswith('.jpeg'):
                mime_type = 'image/jpeg'
            files = {
                'media': (os.path.basename(media_path), open(media_path, 'rb'), mime_type)
            }
            
        print(f"[OPENCLAW GATEWAY] Sending payload to {phone_number}...")
        
        try:
            # Attempt posting to OpenClaw API
            # Puppeteer/Chromium can take 15-25 seconds to upload media, so we allow 30s
            if files:
                res = requests.post(f"{api_url}/send", data=payload, files=files, headers=headers, timeout=30)
            else:
                res = requests.post(f"{api_url}/send", data=payload, headers=headers, timeout=30)
            if res.ok:
                print(f"[OPENCLAW SUCCESS] Message successfully routed!")
                return True, "Delivered via OpenClaw Gateway"
            else:
                return False, f"OpenClaw returned error code {res.status_code}: {res.text}"
        except requests.exceptions.RequestException as e:
            # Graceful local developer fallback!
            print(f"[OPENCLAW SIMULATION] Gateway offline. Message simulated successfully. Content: '{text[:50]}...'")
            return True, f"Simulated Send (Gateway offline: {str(e)})"

    @classmethod
    def send_payment_receipt(cls, customer):
        """
        Generates ReceiptVideo in React, compiles it, and delivers WhatsApp receipt confirmation.
        """
        name = customer.name
        price = customer.price_override if customer.price_override is not None else (customer.plan.price if customer.plan else 0)
        date_str = customer.expiry_date.strftime('%Y-%m-%d') if customer.expiry_date else datetime.date.today().strftime('%Y-%m-%d')
        lang = customer.language_preference
        
        # 1. Compile Receipt Video
        video_path, err = cls.render_video('ReceiptVideo', name, price, date_str, lang)
        
        # 2. Assembles Text Template
        if lang == 'OD':
            text = (
                f"ଧନ୍ୟବାଦ {name}!\n\n"
                f"ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ପ୍ଲାନ ପେମେଣ୍ଟ Rs. {price} ସଫଳତାର ସହ ମିଳିଗଲା।\n"
                f"ଆପଣଙ୍କ ସବସ୍କ୍ରିପସନ୍ ପରବର୍ତ୍ତୀ ଶେଷ ତାରିଖ: *{date_str}* ପର୍ଯ୍ୟନ୍ତ ସଫଳତାର ସହ ନବୀକରଣ ହୋଇଛି।\n\n"
                f"ଆମ ସହିତ ଯୋଡି ହୋଇଥିବାରୁ ଧନ୍ୟବାଦ! (ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ)"
            )
        else:
            text = (
                f"Thank you {name}!\n\n"
                f"Payment of Rs. {price} has been successfully received.\n"
                f"Your Cable TV subscription is renewed until *{date_str}*.\n\n"
                f"Happy viewing! (Mahalaxmi Network)"
            )
            
        # 3. Deliver via OpenClaw Gateway
        success, msg = cls.send_to_openclaw(customer.phone_number, text, media_path=video_path)
        
        # Save video path to DB logs if successfully rendered
        if video_path and os.path.exists(video_path):
            # We return video path relative to Django media root for web serving
            relative_path = os.path.relpath(video_path, settings.MEDIA_ROOT)
            return success, f"{msg} (Receipt Video Compiled: {relative_path})"
        
        return success, f"{msg} (Video render skipped/failed: {err})"

    @classmethod
    def send_due_reminder(cls, customer):
        """
        Generates DueReminderVideo in React, compiles it, and delivers warning due reminder.
        """
        name = customer.name
        price = customer.price_override if customer.price_override is not None else (customer.plan.price if customer.plan else 0)
        date_str = customer.expiry_date.strftime('%Y-%m-%d') if customer.expiry_date else datetime.date.today().strftime('%Y-%m-%d')
        lang = customer.language_preference
        
        # 1. Compile Due Reminder Video
        video_path, err = cls.render_video('DueReminderVideo', name, price, date_str, lang)
        
        # 2. Assembles Text Template
        if lang == 'OD':
            text = (
                f"ପ୍ରିୟ {name},\n\n"
                f"ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ପ୍ଲାନ ({customer.plan.name if customer.plan else 'Active Pack'}) ଆସନ୍ତା *{date_str}* ରେ ଶେଷ ହେଉଛି।\n"
                f"ସେବା ଜାରି ରଖିବା ପାଇଁ ଦୟାକରି Rs. {price} ପ୍ରଦାନ କରନ୍ତୁ।\n\n"
                f"ଧନ୍ୟବାଦ! (ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ)"
            )
        else:
            text = (
                f"Dear {name},\n\n"
                f"Your Cable TV plan ({customer.plan.name if customer.plan else 'Active Pack'}) is expiring on *{date_str}*.\n"
                f"Please pay Rs. {price} to avoid connection suspension.\n\n"
                f"Thank you! (Mahalaxmi Network)"
            )
            
        # 3. Deliver via OpenClaw Gateway
        success, msg = cls.send_to_openclaw(customer.phone_number, text, media_path=video_path)
        
        if video_path and os.path.exists(video_path):
            relative_path = os.path.relpath(video_path, settings.MEDIA_ROOT)
            return success, f"{msg} (Reminder Video Compiled: {relative_path})"
            
        return success, f"{msg} (Video render skipped/failed: {err})"

    @classmethod
    def send_custom_text(cls, customer, text):
        """
        Delivers custom manual text directly to customer.
        """
        success, msg = cls.send_to_openclaw(customer.phone_number, text)
        return success, msg

    @classmethod
    def send_text_receipt(cls, customer):
        """
        Sends standard text payment receipt directly to customer via WhatsApp (no video).
        """
        name = customer.name
        price = customer.price_override if customer.price_override is not None else (customer.plan.price if customer.plan else 0)
        date_str = customer.expiry_date.strftime('%Y-%m-%d') if customer.expiry_date else datetime.date.today().strftime('%Y-%m-%d')
        lang = customer.language_preference
        
        if lang == 'OD':
            text = (
                f"ଧନ୍ୟବାଦ {name}!\n\n"
                f"ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ପେମେଣ୍ଟ Rs. {price} ସଫଳତାର ସହ ମିଳିଗଲା।\n"
                f"ଆପଣଙ୍କ ସବସ୍କ୍ରିପସନ୍ *{date_str}* ପର୍ଯ୍ୟନ୍ତ ସଫଳତାର ସହ ନବୀକରଣ ହୋଇଛି।\n\n"
                f"ଆମ ସହିତ ଯୋଡି ହୋଇଥିବାରୁ ଧନ୍ୟବାଦ! (ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ)"
            )
        else:
            text = (
                f"Thank you {name}!\n\n"
                f"Payment of Rs. {price} has been successfully received.\n"
                f"Your Cable TV subscription is renewed until *{date_str}*.\n\n"
                f"Happy viewing! (Mahalaxmi Network)"
            )
            
        return cls.send_to_openclaw(customer.phone_number, text)

    @classmethod
    def send_text_reminder(cls, customer):
        """
        Sends standard text due reminder directly to customer via WhatsApp (no video).
        """
        name = customer.name
        price = customer.price_override if customer.price_override is not None else (customer.plan.price if customer.plan else 0)
        date_str = customer.expiry_date.strftime('%Y-%m-%d') if customer.expiry_date else datetime.date.today().strftime('%Y-%m-%d')
        lang = customer.language_preference
        
        if lang == 'OD':
            text = (
                f"ପ୍ରିୟ {name},\n\n"
                f"ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ପ୍ଲାନ ({customer.plan.name if customer.plan else 'Active Pack'}) ଆସନ୍ତା *{date_str}* ରେ ଶେଷ ହେଉଛି।\n"
                f"ସେବା ଜାରି ରଖିବା ପାଇଁ ଦୟାକରି Rs. {price} ପ୍ରଦାନ କରନ୍ତୁ।\n\n"
                f"ଧନ୍ୟବାଦ! (ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ)"
            )
        else:
            text = (
                f"Dear {name},\n\n"
                f"Your Cable TV plan ({customer.plan.name if customer.plan else 'Active Pack'}) is expiring on *{date_str}*.\n"
                f"Please pay Rs. {price} to avoid connection suspension.\n\n"
                f"Thank you! (Mahalaxmi Network)"
            )
            
        return cls.send_to_openclaw(customer.phone_number, text)

    @classmethod
    def send_deactivation_alert(cls, customer):
        """
        Sends deactivation alert directly to customer via WhatsApp.
        """
        name = customer.name
        price = customer.price_override if customer.price_override is not None else (customer.plan.price if customer.plan else 0)
        lang = customer.language_preference
        
        if lang == 'OD':
            text = (
                f"ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ଚେତାବନୀ: ପ୍ରିୟ {name},\n\n"
                f"ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ପ୍ଲାନ ଆଜି ଶେଷ ହୋଇଯାଇଛି। ସେବା ବନ୍ଦ ହେବାକୁ ରୋକିବା ପାଇଁ ଦୟାକରି ଯଥାଶୀଘ୍ର Rs. {price} ରିଚାର୍ଜ କରନ୍ତୁ।\n\n"
                f"ଧନ୍ୟବାଦ! (ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ)"
            )
        else:
            text = (
                f"CRITICAL ALERT: Dear {name},\n\n"
                f"Your Cable TV subscription has expired today. Please pay Rs. {price} immediately to prevent deactivation and avoid service suspension.\n\n"
                f"Thank you! (Mahalaxmi Network)"
            )
            
        return cls.send_to_openclaw(customer.phone_number, text)

    @staticmethod
    def generate_upi_qr(price):
        """
        Generates a UPI payment QR code PNG using a public API.
        UPI URI: upi://pay?pa=9777547420@ybl&pn=Mahalaxmi%20Network&am={price}&cu=INR
        Returns the absolute path to the generated PNG file.
        """
        import urllib.parse
        upi_uri = f"upi://pay?pa=9777547420@ybl&pn=Mahalaxmi%20Network&am={price}&cu=INR"
        encoded_uri = urllib.parse.quote_plus(upi_uri)
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={encoded_uri}"
        
        base_dir = Path(settings.BASE_DIR)
        renders_dir = base_dir / 'media' / 'renders'
        os.makedirs(renders_dir, exist_ok=True)
        
        out_filename = f"upi_qr_{int(float(price))}.png"
        out_path = renders_dir / out_filename
        
        try:
            res = requests.get(qr_url, timeout=5)
            if res.ok:
                with open(out_path, 'wb') as f:
                    f.write(res.content)
                return str(out_path.resolve())
        except Exception as e:
            print(f"[UPI QR ERROR] Failed to fetch QR code: {str(e)}")
            
        return None

    @classmethod
    def send_upi_qr_reminder(cls, customer):
        """
        Generates a dynamic payment QR code with UPI, and sends it directly to customer as a media message.
        """
        name = customer.name
        price = customer.price_override if customer.price_override is not None else (customer.plan.price if customer.plan else 0)
        date_str = customer.expiry_date.strftime('%Y-%m-%d') if customer.expiry_date else datetime.date.today().strftime('%Y-%m-%d')
        lang = customer.language_preference
        
        # 1. Generate QR Code Image
        qr_path = cls.generate_upi_qr(price)
        
        # 2. Assemble Text Template
        if lang == 'OD':
            text = (
                f"ପ୍ରିୟ {name},\n\n"
                f"ଆପଣଙ୍କର କେବୁଲ୍ ଟିଭି ପ୍ଲାନ ({customer.plan.name if customer.plan else 'Active Pack'}) ଆସନ୍ତା *{date_str}* ରେ ଶେଷ ହେଉଛି।\n"
                f"ସେବା ଜାରି ରଖିବା ପାଇଁ ଦୟାକରି ସଂଲଗ୍ନ UPI QR କୋଡ୍ ସ୍କାନ କରି Rs. {price} ପୈଠ କରନ୍ତୁ।\n"
                f"UPI ID: 9777547420@ybl\n\n"
                f"ଧନ୍ୟବାଦ! (ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ)"
            )
        else:
            text = (
                f"Dear {name},\n\n"
                f"Your Cable TV plan ({customer.plan.name if customer.plan else 'Active Pack'}) is expiring on *{date_str}*.\n"
                f"To keep your service active, please scan the attached UPI QR code and pay Rs. {price}.\n"
                f"UPI ID: 9777547420@ybl\n\n"
                f"Thank you! (Mahalaxmi Network)"
            )
            
        success, msg = cls.send_to_openclaw(customer.phone_number, text, media_path=qr_path)
        return success, msg

    @staticmethod
    def generate_history_image(customer):
        """
        Generates a premium transaction history card for the customer as an image.
        Summarizes customer details and their last 7 payments.
        Returns the absolute path to the generated PNG image.
        """
        from PIL import Image, ImageDraw, ImageFont
        import os
        from django.conf import settings
        from pathlib import Path
        
        # Gather last 7 transactions
        transactions = customer.transactions.all().order_by('-created_at')[:7]
        
        # Dimensions and setup
        width, height = 800, 950
        image = Image.new("RGB", (width, height), "#f8fafc")
        draw = ImageDraw.Draw(image)
        
        # Helper to load fonts safely
        def load_font(size, bold=False):
            font_name = "arialbd.ttf" if bold else "arial.ttf"
            paths = [
                font_name,
                os.path.join("C:\\Windows\\Fonts", font_name),
                os.path.join("/usr/share/fonts/truetype/dejavu", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
                os.path.join("/usr/share/fonts/truetype/liberation", "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"),
            ]
            for p in paths:
                try:
                    return ImageFont.truetype(p, size)
                except:
                    continue
            return ImageFont.load_default()
            
        font_title = load_font(32, bold=True)
        font_subtitle = load_font(20, bold=False)
        font_header = load_font(18, bold=True)
        font_text = load_font(16, bold=False)
        font_bold = load_font(16, bold=True)
        font_footer = load_font(14, bold=False)
        
        # Draw elegant Navy Header Banner
        draw.rectangle([(0, 0), (width, 160)], fill="#1e1b4b")
        draw.text((40, 35), "MAHALAXMI NETWORK", fill="#ffffff", font=font_title)
        draw.text((40, 85), "ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ - CUSTOMER BILLING HISTORY", fill="#a5b4fc", font=font_subtitle)
        
        # Draw Customer Card Box
        draw.rectangle([(40, 190), (width - 40, 340)], fill="#ffffff", outline="#e2e8f0", width=2)
        draw.text((60, 205), "Customer Name:", fill="#64748b", font=font_text)
        draw.text((200, 205), customer.name, fill="#1e293b", font=font_bold)
        
        draw.text((60, 240), "Mobile Number:", fill="#64748b", font=font_text)
        draw.text((200, 240), customer.phone_number, fill="#1e293b", font=font_bold)
        
        draw.text((60, 275), "Current Package:", fill="#64748b", font=font_text)
        plan_desc = f"{customer.plan.name} (Rs. {customer.price_override if customer.price_override is not None else customer.plan.price})" if customer.plan else "Custom Active Package"
        draw.text((200, 275), plan_desc, fill="#2563eb", font=font_bold)
        
        draw.text((60, 310), "Status:", fill="#64748b", font=font_text)
        status_text = "PAID (Active)" if customer.is_paid else "UNPAID (Pending Payment)"
        status_color = "#16a34a" if customer.is_paid else "#dc2626"
        draw.text((200, 310), status_text, fill=status_color, font=font_bold)
        
        # Draw Table Section Header
        draw.text((40, 375), "LAST 7 TRANSACTIONS HISTORY", fill="#0f172a", font=font_header)
        
        # Table Coordinates
        t_top = 410
        row_height = 55
        col_x = [60, 210, 480, 620] # Date, Package, Amount, Expiry
        
        # Draw Table Headers
        draw.rectangle([(40, t_top), (width - 40, t_top + row_height)], fill="#e2e8f0")
        draw.text((col_x[0], t_top + 18), "PAYMENT DATE", fill="#334155", font=font_header)
        draw.text((col_x[1], t_top + 18), "BILLING PACKAGE", fill="#334155", font=font_header)
        draw.text((col_x[2], t_top + 18), "AMOUNT", fill="#334155", font=font_header)
        draw.text((col_x[3], t_top + 18), "EXPIRY DATE", fill="#334155", font=font_header)
        
        current_y = t_top + row_height
        
        if not transactions.exists():
            # Draw empty table placeholder
            draw.rectangle([(40, current_y), (width - 40, current_y + row_height * 2)], fill="#ffffff", outline="#e2e8f0", width=1)
            draw.text((width // 2 - 120, current_y + row_height - 10), "No payment transactions recorded yet.", fill="#64748b", font=font_text)
            current_y += row_height * 2
        else:
            for idx, tx in enumerate(transactions):
                bg_color = "#f8fafc" if idx % 2 == 1 else "#ffffff"
                draw.rectangle([(40, current_y), (width - 40, current_y + row_height)], fill=bg_color, outline="#e2e8f0", width=1)
                
                # Format Dates and strings
                pay_date = tx.payment_date.strftime('%Y-%m-%d')
                exp_date = tx.expiry_date.strftime('%Y-%m-%d')
                amount_str = f"Rs. {tx.amount}"
                plan_name = tx.plan_name[:24] + "..." if len(tx.plan_name) > 27 else tx.plan_name
                
                # Draw Row Text
                draw.text((col_x[0], current_y + 18), pay_date, fill="#1e293b", font=font_text)
                draw.text((col_x[1], current_y + 18), plan_name, fill="#1e293b", font=font_text)
                draw.text((col_x[2], current_y + 18), amount_str, fill="#16a34a", font=font_bold)
                draw.text((col_x[3], current_y + 18), exp_date, fill="#1e293b", font=font_text)
                
                current_y += row_height
                
        # Draw Premium Security Footer
        draw.rectangle([(0, height - 100), (width, height)], fill="#f1f5f9")
        draw.text((40, height - 70), "This statement is securely compiled and digitally delivered by Mahalaxmi Network.", fill="#475569", font=font_footer)
        draw.text((40, height - 45), "For queries or support, please contact UPI Operator: +91 9777547420", fill="#64748b", font=font_footer)
        
        # Save image
        renders_dir = Path(settings.MEDIA_ROOT) / 'renders'
        os.makedirs(renders_dir, exist_ok=True)
        out_filename = f"tx_history_{customer.id.hex[:10]}.png"
        out_path = renders_dir / out_filename
        image.save(out_path, "PNG")
        
        return str(out_path.resolve())

    @classmethod
    def send_greeting_message(cls, customer):
        """
        Sends a professional welcome greeting to the new customer via WhatsApp.
        """
        name = customer.name
        lang = customer.language_preference
        phone = customer.phone_number

        if lang == 'OD':
            text = (
                f"ପ୍ରିୟ {name},\n\n"
                f"ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ! 🌸 ଆପଣଙ୍କର ସବସ୍କ୍ରିପସନ୍ ଆକାଉଣ୍ଟ ସଫଳତାର ସହ ପଞ୍ଜୀକୃତ ହୋଇଛି।\n\n"
                f"📞 ସହାୟତା ପାଇଁ ଯୋଗାଯୋଗ ବିବରଣୀ:\n"
                f"• ନାମ: ଲକ୍ଷ୍ମୀଧର ସାହୁ (LAXMIDHARA SAHOO)\n"
                f"• ମୋବାଇଲ୍: +91 9777546420\n"
                f"• ଇମେଲ୍: amareshasahoo@gmail.com\n"
                f"• ଠିକଣା: Siaria, Siaria Bada Sahi, 754037\n\n"
                f"ଆମ ସହିତ ଯୋଡି ହୋଇଥିବାରୁ ଧନ୍ୟବାଦ! (ମହାଲକ୍ଷ୍ମୀ ନେଟୱର୍କ)"
            )
        else:
            text = (
                f"Dear {name},\n\n"
                f"Welcome to Mahalaxmi Network! 🌸 Your subscription account has been successfully registered.\n\n"
                f"📞 Contact Details for Support:\n"
                f"• Name: LAXMIDHARA SAHOO (ଲକ୍ଷ୍ମୀଧର ସାହୁ)\n"
                f"• Mobile: +91 9777546420\n"
                f"• Email: amareshasahoo@gmail.com\n"
                f"• Address: Siaria, Siaria Bada Sahi, 754037\n\n"
                f"Thank you for choosing us! (Mahalaxmi Network)"
            )

        return cls.send_to_openclaw(phone, text)
