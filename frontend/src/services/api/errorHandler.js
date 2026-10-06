export function handleApiError(error) {
  if (error.response) {
    const message = error.response.data?.message || error.response.data?.error || 'An error occurred on the server.';
    return { status: error.response.status, message, data: error.response.data };
  } else if (error.request) {
    return { status: 0, message: 'Network error. Please check your connection.', data: null };
  } else {
    return { status: 0, message: error.message || 'An unknown error occurred.', data: null };
  }
}

export default handleApiError;
