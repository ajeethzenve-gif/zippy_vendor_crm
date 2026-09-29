from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Employee, Role, UserRole


class EmployeeAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = get_user_model().objects.create_superuser('admin', 'admin@example.com', 'Strong!Admin947')
        self.client.force_authenticate(self.admin)
        self.payload = dict(first_name='Aditi', last_name='Sharma', email='ADITI@example.com', username='aditi.finance', password='River!Cobalt82Moon', role='Finance', phone_number='+919876543210', joining_date='2026-09-27', city='Pune')

    def create(self, **changes):
        return self.client.post('/api/employees/', {**self.payload, **changes}, format='json')

    def test_creation_links_employee_auth_user_and_role(self):
        response = self.create(is_staff=True, is_superuser=True)
        self.assertEqual(response.status_code, 201, response.data)
        employee = Employee.objects.get()
        self.assertEqual(employee.user._meta.db_table, 'auth_user')
        self.assertEqual(employee.user.username, self.payload['username'])
        self.assertEqual(employee.user.email, 'aditi@example.com')
        self.assertTrue(employee.user.check_password(self.payload['password']))
        self.assertNotEqual(employee.user.password, self.payload['password'])
        self.assertFalse(employee.user.is_staff)
        self.assertFalse(employee.user.is_superuser)
        self.assertEqual(employee.user.user_role.role.name, 'Finance')
        self.assertEqual(employee.designation, 'Finance')
        self.assertTrue(employee.employee_id.startswith('EMP-'))
        self.assertNotIn('password', response.data)
        self.assertNotIn('password', self.client.get('/api/employees/').data[0])
        self.client.force_authenticate(None)
        for identifier in [self.payload['username'], 'aditi@example.com']:
            login = self.client.post('/api/login/', dict(username=identifier, password=self.payload['password']), format='json')
            self.assertEqual(login.status_code, 200, login.data)
            self.assertEqual(login.data['role'], 'Finance')
            self.assertFalse(login.data['is_staff'])

    def test_permissions(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.create().status_code, 401)
        for role_name in ['Finance', 'Vendor']:
            user = get_user_model().objects.create_user(username=role_name, password='River!Cobalt82Moon')
            role, _ = Role.objects.get_or_create(name=role_name)
            UserRole.objects.create(user=user, role=role)
            self.client.force_authenticate(user)
            for url in ['/api/employees/', '/api/employee-roles/']:
                self.assertEqual(self.client.get(url).status_code, 403)
            self.assertEqual(self.create().status_code, 403)
        self.assertFalse(Employee.objects.exists())

    def test_crm_admin_can_create_without_django_admin_access(self):
        self.assertEqual(self.create(role='Admin').status_code, 201)
        user = Employee.objects.get().user
        self.assertFalse(user.is_staff)
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get('/api/employees/').status_code, 200)
        self.assertEqual(self.client.get('/api/employee-roles/').status_code, 200)

    def test_validation_and_duplicates(self):
        for changes in [dict(password='123'), dict(phone_number='bad'), dict(role='Vendor'), dict(role='Unknown'), dict(email='bad'), dict(username='bad username'), dict(first_name=''), dict(date_of_birth='2099-01-01')]:
            with self.subTest(changes=list(changes)):
                self.assertEqual(self.create(**changes).status_code, 400)
        self.assertFalse(Employee.objects.exists())
        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertEqual(self.create().status_code, 201)
        self.assertEqual(self.create(username='ADITI.FINANCE', email='new@example.com', phone_number='+919876543211').status_code, 400)
        self.assertEqual(self.create(username='another', email='aditi@EXAMPLE.com', phone_number='+919876543211').status_code, 400)
        self.assertEqual(self.create(username='another', email='new@example.com').status_code, 400)
        self.assertEqual(Employee.objects.count(), 1)

    def test_transaction_rolls_back_partial_user(self):
        with patch('accounts.employee_api.Employee.objects.create', side_effect=IntegrityError):
            response = self.create()
        self.assertEqual(response.status_code, 400)
        self.assertFalse(get_user_model().objects.filter(username=self.payload['username']).exists())
        self.assertFalse(UserRole.objects.exists())

    def test_media_role_supported_and_disabled_account_cannot_login(self):
        self.assertEqual(self.create(role='Media').status_code, 201)
        user = Employee.objects.get().user
        user.is_active = False
        user.save(update_fields=['is_active'])
        self.client.force_authenticate(None)
        response = self.client.post('/api/login/', dict(username=user.username, password=self.payload['password']), format='json')
        self.assertEqual(response.status_code, 401)
