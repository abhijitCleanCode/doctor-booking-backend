//* Node has in built error class inherit that class to standarized error response
class ApiError extends Error {
    constructor(
      statusCode,
      message = "Uh oh! an error occurred",
      errors = [],
      stack = "" // To trace where exactly the error is
    ) {
      super(message);
      this.statusCode = statusCode;
      this.message = message;
      this.data = null;
      this.success = false;
      this.errors = errors;
  
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  export { ApiError };
  