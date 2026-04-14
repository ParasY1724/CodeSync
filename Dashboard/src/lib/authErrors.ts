// Safe error message mapper to prevent information leakage
// Maps authentication and database errors to generic user-friendly messages

export const getSafeAuthMessage = (error: any): string => {
  const msg = error?.message?.toLowerCase() || '';
  
  // Account enumeration prevention
  if (msg.includes('already registered') || msg.includes('user not found') || 
      msg.includes('invalid login') || msg.includes('email not confirmed')) {
    return 'Unable to process request. Please verify your information.';
  }
  
  // Password policy hiding
  if (msg.includes('password')) {
    return 'Please check your password and try again.';
  }
  
  // Rate limiting (generic message)
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please try again later.';
  }
  
  // Email validation
  if (msg.includes('email')) {
    return 'Please check your email and try again.';
  }
  
  // Generic fallback
  return 'Authentication failed. Please try again or contact support.';
};

export const getSafeProfileMessage = (error: any): string => {
  const msg = error?.message?.toLowerCase() || '';
  
  // Rate limiting
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please try again later.';
  }
  
  // Database constraint errors
  if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('constraint')) {
    return 'Unable to save changes. Please try with different values.';
  }
  
  // Permission errors
  if (msg.includes('permission') || msg.includes('policy')) {
    return 'You do not have permission to perform this action.';
  }
  
  // Generic fallback
  return 'Failed to update profile. Please try again.';
};
