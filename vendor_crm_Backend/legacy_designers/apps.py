from django.apps import AppConfig

class LegacyDesignersConfig(AppConfig):
    name = "legacy_designers"
    label = "designers"
    verbose_name = "Historical migration state (no runtime models)"
    default_auto_field = "django.db.models.BigAutoField"
