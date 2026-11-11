import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Test data URI formatting pure logic
function formatDataUri(base64OrUri, mimeType = 'image/jpeg') {
  if (!base64OrUri) return '';
  if (base64OrUri.startsWith('data:')) {
    return base64OrUri;
  }
  if (base64OrUri.startsWith('http://') || base64OrUri.startsWith('https://') || base64OrUri.startsWith('file://')) {
    return base64OrUri;
  }
  return `data:${mimeType};base64,${base64OrUri}`;
}

test('formatDataUri wraps raw base64 strings with data prefix', () => {
  const rawBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...';
  const result = formatDataUri(rawBase64);
  assert.strictEqual(result, `data:image/jpeg;base64,${rawBase64}`);
});

test('formatDataUri preserves existing data URIs unmodified', () => {
  const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
  const result = formatDataUri(dataUri);
  assert.strictEqual(result, dataUri);
});

test('formatDataUri preserves http/https/file URLs unmodified', () => {
  const httpUrl = 'https://images.unsplash.com/photo-1534528741775';
  const fileUrl = 'file:///var/mobile/Containers/Data/image.jpg';
  assert.strictEqual(formatDataUri(httpUrl), httpUrl);
  assert.strictEqual(formatDataUri(fileUrl), fileUrl);
});

test('formatDataUri returns empty string for null or empty input', () => {
  assert.strictEqual(formatDataUri(''), '');
  assert.strictEqual(formatDataUri(null), '');
});

// 2. Test Step 1 Validation logic
function validateStep1Credentials(email, password) {
  const cleanEmail = email ? email.trim() : '';
  if (!cleanEmail) {
    return { valid: false, error: 'email_required' };
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { valid: false, error: 'email_invalid' };
  }
  if (!password || password.length < 6) {
    return { valid: false, error: 'password_min_length' };
  }
  return { valid: true, error: null };
}

test('validateStep1Credentials enforces email presence, format and min 6-char password', () => {
  assert.deepStrictEqual(validateStep1Credentials('', '123456'), { valid: false, error: 'email_required' });
  assert.deepStrictEqual(validateStep1Credentials('invalid-email', '123456'), { valid: false, error: 'email_invalid' });
  assert.deepStrictEqual(validateStep1Credentials('user@test', '123456'), { valid: false, error: 'email_invalid' });
  assert.deepStrictEqual(validateStep1Credentials('user@test.com', '12345'), { valid: false, error: 'password_min_length' });
  assert.deepStrictEqual(validateStep1Credentials('  user@test.com  ', '123456'), { valid: true, error: null });
});

// 3. Test Step 2 Validation logic
function validateStep2PersonalInfo(fullName, age, gender) {
  const cleanName = fullName ? fullName.trim() : '';
  if (!cleanName) {
    return { valid: false, error: 'name_required' };
  }
  const parsedAge = parseInt((age || '').trim(), 10);
  if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 99) {
    return { valid: false, error: 'age_invalid' };
  }
  if (!gender) {
    return { valid: false, error: 'gender_required' };
  }
  return { valid: true, error: null };
}

test('validateStep2PersonalInfo enforces name, age range (10-99) and gender selection', () => {
  assert.deepStrictEqual(validateStep2PersonalInfo('', '25', 'female'), { valid: false, error: 'name_required' });
  assert.deepStrictEqual(validateStep2PersonalInfo('Jane Doe', '9', 'female'), { valid: false, error: 'age_invalid' });
  assert.deepStrictEqual(validateStep2PersonalInfo('Jane Doe', '100', 'female'), { valid: false, error: 'age_invalid' });
  assert.deepStrictEqual(validateStep2PersonalInfo('Jane Doe', 'abc', 'female'), { valid: false, error: 'age_invalid' });
  assert.deepStrictEqual(validateStep2PersonalInfo('Jane Doe', '25', null), { valid: false, error: 'gender_required' });
  assert.deepStrictEqual(validateStep2PersonalInfo('Jane Doe', '25', 'female'), { valid: true, error: null });
  assert.deepStrictEqual(validateStep2PersonalInfo('John Doe', '30', 'male'), { valid: true, error: null });
  assert.deepStrictEqual(validateStep2PersonalInfo('Alex Doe', '22', 'non-binary'), { valid: true, error: null });
});

// 4. Test Demo Credentials & URLs
test('Demo credentials match expectations', () => {
  const DEMO_EMAIL = 'demo@vitra.ai';
  const DEMO_PASS = 'password123';
  assert.strictEqual(validateStep1Credentials(DEMO_EMAIL, DEMO_PASS).valid, true);
});

// 5. Resilience: Avatar timeout recovery logic simulation
async function simulateProfileSetupWithTimeoutRecovery(hasBodyPhoto, mockSetupUserProfile, mockGetLatestAvatarModel) {
  let setupRes = null;
  try {
    setupRes = await mockSetupUserProfile();
  } catch (setupErr) {
    // Si la llamada parpadeó o se agotó el tiempo, pero había foto corporal
    if (hasBodyPhoto) {
      try {
        const latest = await mockGetLatestAvatarModel();
        if (latest?.avatar_url) {
          setupRes = {
            avatar_url: latest.avatar_url,
            avatar_type: 'custom_3d',
          };
        }
      } catch {
        // Fallback silencioso
      }
    }
  }
  return setupRes;
}

test('Resilience: successfully recovers 3D avatar when setupUserProfile network times out', async () => {
  const mockSetupFail = async () => {
    const error = new Error('Network request failed / Timeout');
    throw error;
  };
  const mockGetLatestSuccess = async () => ({
    avatar_url: 'https://storage.vitra.ai/models/avatar_recovered_123.glb',
  });

  const result = await simulateProfileSetupWithTimeoutRecovery(true, mockSetupFail, mockGetLatestSuccess);
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.avatar_url, 'https://storage.vitra.ai/models/avatar_recovered_123.glb');
  assert.strictEqual(result.avatar_type, 'custom_3d');
});

// 6. Backend Image Validation: detect non-person rejection
function isNonPersonImageError(error) {
  if (!error) return false;
  if (error.status === 400) return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('persona') || msg.includes('rostro') || msg.includes('imagen');
}

test('Backend Validation: recognizes human verification error messages accurately', () => {
  assert.strictEqual(isNonPersonImageError({ message: 'Esta imagen no parece ser de una persona' }), true);
  assert.strictEqual(isNonPersonImageError({ message: 'No se detectó un rostro humano claro' }), true);
  assert.strictEqual(isNonPersonImageError({ message: 'Error procesando la imagen subida' }), true);
  assert.strictEqual(isNonPersonImageError({ status: 400 }), true);
  assert.strictEqual(isNonPersonImageError({ message: 'Database connection failed' }), false);
});

// 7. Existing Account Fallback simulation
function handleRegistrationAccountCollision(error) {
  if (error?.message?.includes('Ya existe una cuenta')) {
    return { shouldAttemptLoginDirectly: true };
  }
  return { shouldAttemptLoginDirectly: false };
}

test('Existing account collision gracefully redirects to authentication', () => {
  assert.deepStrictEqual(
    handleRegistrationAccountCollision({ message: 'Ya existe una cuenta registrada con este correo electrónico' }),
    { shouldAttemptLoginDirectly: true }
  );
  assert.deepStrictEqual(
    handleRegistrationAccountCollision({ message: 'Internal server error' }),
    { shouldAttemptLoginDirectly: false }
  );
});
