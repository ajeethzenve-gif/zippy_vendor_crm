"""Run vendor tests against an isolated in-memory database."""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zenvefashion.settings")
from django.conf import settings
settings.DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
import django
django.setup()
from django.core.management import call_command
call_command("test", "vendors", verbosity=2)
