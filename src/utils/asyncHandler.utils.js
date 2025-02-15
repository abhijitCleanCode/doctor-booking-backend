// hoc
const asyncHandler = (fn) => {
  return async (request, response, next) => {
    try {
      await fn(request, response, next);
    } catch (error) {
      response.status(error.code || 500).json({
        success: false,
        message: error.message,
      });
    }
  };
};

export { asyncHandler };

// Potential improvements
/*
   Instead of directly sending the error response in asyncHandler, consider passing the error to the next function for centralized error handling. This allows customize error handling in one place and keep the code DRY (Don’t Repeat Yourself).
*/
