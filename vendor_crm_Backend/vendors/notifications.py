"""Vendor emails. Call only after the associated transaction commits."""
import logging
from collections import defaultdict
from decimal import Decimal
from urllib.parse import urlencode, urlsplit

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def portal_url(path):
    # Configured by the operator; never build credential links from a request Host.
    configured_url = settings.VENDOR_PORTAL_URL.strip().rstrip("/")
    try:
        parsed = urlsplit(configured_url)
        valid = (parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password
                 and parsed.path in {"", "/vendor-login"} and not parsed.query and not parsed.fragment)
        parsed.port  # Validate an explicitly configured port before generating links.
    except ValueError:
        valid = False
    if not valid:
        logger.error("Vendor access-link email skipped: configure VENDOR_PORTAL_URL as an HTTPS origin")
        return None
    return f"https://{parsed.netloc}{path}"


def deliver(vendor, subject, body):
    recipient = (vendor.email or "").strip()
    if not recipient:
        logger.warning("Vendor email skipped: no email for vendor %s", vendor.pk)
        return
    footer = f"\n\nZenve\nCompany GSTIN: {settings.COMPANY_GST_NUMBER}"
    try:
        send_mail(subject, body + footer, settings.VENDOR_FROM_EMAIL, [recipient], fail_silently=False)
    except Exception as error:
        # Never expose credentials, PAN links, or provider exceptions in logs.
        code = getattr(error, "smtp_code", None)
        logger.error("Vendor email delivery failed for vendor %s (%s): %s; SMTP code=%s",
                     vendor.pk, subject, type(error).__name__, code if isinstance(code, int) else "unavailable")


def welcome(vendor):
    deliver(vendor, "Welcome to Zenve — approval pending", (
        f"Hello {vendor.vendor_name},\n\nWelcome to Zenve! We have received your vendor registration "
        f"for {vendor.brand_name}. Your account is pending approval by our team.\n\n"
        "We will email your login instructions after approval. You do not need to log in yet."
    ))


def approved(vendor, user, initial_password=None):
    login = portal_url('/')
    if not login:
        return
    password_line = f"Initial password: {initial_password}" if initial_password else "Password: use your existing password."
    deliver(vendor, "Your Zenve vendor account is approved", (
        f"Hello {vendor.vendor_name},\n\nYour vendor account is approved.\n\n"
        f"Login: {login}\nUsername: {user.username}\n{password_line}\n\n"
        "Mobile OTP login: open the vendor login page, choose mobile OTP login, enter your "
        "registered mobile number, request the OTP, then enter the code received by SMS. "
        "Do not share your password or OTP with anyone."
    ))


def kyc_started(vendor, row):
    destination = portal_url('/vendor-kyc-submit')
    if not destination:
        return
    from .kyc_links import issue_token
    link = destination + '#' + urlencode({"token": issue_token(row)})
    deliver(vendor, "Zenve KYC started — submit your PAN details", (
        f"Hello {vendor.vendor_name},\n\nYour KYC verification has started. Submit your PAN number, "
        "name as printed on PAN, and date of birth using this secure link:\n\n"
        f"{link}\n\nThis link is valid for 48 hours and can be used for one submission. "
        "GSTIN is optional. Do not reply to this email with PAN details or forward this link. "
        "After expiry, ask your account team to send a new KYC request."
    ))


def order_placed(order_id):
    from orders.models import Order
    from products.models import Product
    order = Order.objects.get(pk=order_id)
    items = list(order.items.all())
    ids = [int(item.product_id) for item in items if str(item.product_id).isdigit()]
    products = {str(product.pk): product for product in Product.objects.filter(pk__in=ids).select_related("vendor")}
    groups = defaultdict(list)
    vendors = {}
    for item in items:
        product = products.get(str(item.product_id))
        # Ownership and descriptions come from the catalogue, never buyer-supplied metadata.
        if not product or not product.vendor_id:
            continue
        vendors[product.vendor_id] = product.vendor
        groups[product.vendor_id].append((product, item))
    for vendor_id, rows in groups.items():
        lines = [f"Product: {product.product_name} | SKU: {product.sku} | Quantity: {item.quantity} | "
                 f"Unit amount: INR {item.price:.2f} | Amount: INR {item.total:.2f}"
                 for product, item in rows]
        amount = sum((item.total for _, item in rows), Decimal("0.00"))
        # No customer fields, full order total, or other vendors' items enter this message.
        deliver(vendors[vendor_id], f"New Zenve order #{order.pk} for your products", (
            f"Order #{order.pk} has been placed for your products.\n\n" + "\n".join(lines) +
            f"\n\nYour products total: INR {amount:.2f}"
        ))
