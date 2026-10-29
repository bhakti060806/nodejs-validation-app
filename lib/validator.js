'use strict';
/**
 * Custom module: validator.js
 * Pure functions that validate the registration payload on the SERVER.
 * Returns an object { valid: boolean, errors: { field: message }, clean: {...} }
 */

const COURSES = ['Computer Engineering', 'IT', 'AI & DS', 'Mechanical', 'Electronics'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,49}$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian 10-digit mobile number

function validateRegistration(body) {
  const errors = {};
  const data = body && typeof body === 'object' ? body : {};

  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim().toLowerCase();
  const phone = String(data.phone ?? '').trim();
  const course = String(data.course ?? '').trim();
  const password = String(data.password ?? '');
  const confirmPassword = String(data.confirmPassword ?? '');
  const age = Number(data.age);

  // name
  if (!name) errors.name = 'Name is required';
  else if (!NAME_RE.test(name)) errors.name = 'Name must be 2-50 characters (letters, space, . \' -)';

  // email
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email)) errors.email = 'Email format is invalid';

  // phone
  if (!phone) errors.phone = 'Phone is required';
  else if (!PHONE_RE.test(phone)) errors.phone = 'Phone must be a 10-digit number starting with 6-9';

  // age
  if (data.age === undefined || data.age === '') errors.age = 'Age is required';
  else if (!Number.isInteger(age) || age < 16 || age > 100) errors.age = 'Age must be a whole number between 16 and 100';

  // course
  if (!course) errors.course = 'Course is required';
  else if (!COURSES.includes(course)) errors.course = 'Course must be one of: ' + COURSES.join(', ');

  // password
  if (!password) errors.password = 'Password is required';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    errors.password = 'Password needs an uppercase letter, a lowercase letter, a digit and a special character';
  }

  // confirm password
  if (!errors.password && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    clean: { name, email, phone, age, course, password }
  };
}

module.exports = { validateRegistration, COURSES };
