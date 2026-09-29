"""Regression check for upgrading legacy owners with deliberately different IDs.
Uses a temporary SQLite database; never touches the configured MySQL database.
Run: python scripts/check_vendor_upgrade.py
"""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ['DJANGO_SETTINGS_MODULE'] = 'zenvefashion.settings'
os.environ['DB_ENGINE'] = 'sqlite'
with tempfile.TemporaryDirectory() as directory:
    os.environ['SQLITE_NAME'] = str(Path(directory) / 'upgrade.sqlite3')
    import django
    django.setup()
    from django.db import connection
    from django.db.migrations.executor import MigrationExecutor
    executor = MigrationExecutor(connection)
    old = [('vendors', '0007_copy_vendor_images'), ('products', '0012_alter_product_fulfilment_location_and_more'), ('orders', '0005_alter_orderitem_table'), ('credits', '0007_alter_designercreditwallet_offline_credits_and_more')]
    executor.migrate(old)
    apps = executor.loader.project_state(old).apps
    Legacy = apps.get_model('designers', 'Designer')
    Vendor = apps.get_model('vendors', 'Vendor')
    Product = apps.get_model('products', 'Product')
    Wallet = apps.get_model('credits', 'DesignerCreditWallet')
    Statement = apps.get_model('credits', 'DesignerCreditStatement')
    Account = apps.get_model('designers', 'DesignerAccountDetails')
    for old_id, new_id in [(41, 42), (42, 41)]:
        Legacy.objects.create(id=old_id, designer_code=f'OLD-{old_id}', designer_name='Owner', brand_name='Brand')
        Vendor.objects.create(id=new_id, crm_record_id=old_id, vendor_code=f'VND-{new_id}', vendor_name='Owner', brand_name='Brand')
        Product.objects.create(designer_id=old_id, sku=f'UPGRADE-{old_id}', product_name='Pet bowl', mrp=100, selling_price=90)
        wallet = Wallet.objects.create(designer_id=old_id, online_credits=12345)
        Statement.objects.create(designer_id=old_id, wallet=wallet, points=-500, description='Existing purchase')
        Account.objects.create(designer_id=old_id, account_holder_name='Owner', account_number='123456789', ifsc_code='HDFC0001234', pan_number='ABCDE1234F')
    executor = MigrationExecutor(connection)
    executor.migrate(executor.loader.graph.leaf_nodes())
    from vendors.models import Vendor, VendorAccountDetails
    from products.models import Product
    from credits.models import DesignerCreditWallet, DesignerCreditStatement
    for old_id, new_id in [(41, 42), (42, 41)]:
        assert Product.objects.get(sku=f'UPGRADE-{old_id}').designer_id == new_id
        assert DesignerCreditWallet.objects.get(designer_id=new_id).online_credits == 12345
        assert DesignerCreditStatement.objects.get(designer_id=new_id).points == -500
        assert VendorAccountDetails.objects.get(vendor_id=new_id).account_number == '123456789'
        assert Vendor.objects.get(pk=new_id).legacy_designer_id == old_id
    connection.close()
    print('PASS: products, wallets, statements and bank accounts retain the correct vendor ownership with crossed IDs.')
