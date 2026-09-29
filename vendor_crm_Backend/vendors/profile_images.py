"""Vendor profile images are stored directly on the vendor."""
from .models import Vendor

def vendor_for_profile(record):
    if not isinstance(record, Vendor):
        raise TypeError("A Vendor record is required")
    return record
