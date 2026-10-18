// Input and data validation utilities

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validateEventPayload(payload) {
  const errors = {};
  if (!payload.title || !payload.title.trim()) {
    errors.title = 'Event title is required';
  }
  if (!payload.description || !payload.description.trim()) {
    errors.description = 'Event description is required';
  }
  if (!payload.location || !payload.location.trim()) {
    errors.location = 'Location is required';
  }
  if (!payload.start_at) {
    errors.start_at = 'Start time is required';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateAnnouncementPayload(payload) {
  const errors = {};
  if (!payload.title || !payload.title.trim()) {
    errors.title = 'Title is required';
  }
  if (!payload.body || !payload.body.trim()) {
    errors.body = 'Announcement content is required';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateResourcePayload(payload) {
  const errors = {};
  if (!payload.title || !payload.title.trim()) {
    errors.title = 'Title is required';
  }
  if (!payload.file_url || !payload.file_url.trim()) {
    errors.file_url = 'Resource URL or file is required';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
