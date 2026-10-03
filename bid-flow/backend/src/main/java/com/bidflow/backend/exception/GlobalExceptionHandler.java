package com.bidflow.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;   
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // =====================================================
    // 1. UserNotFoundException → 404 Not Found
    // =====================================================
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(
            UserNotFoundException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(
                OffsetDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // =====================================================
    // 1.1 AuctionNotFoundException → 404 Not Found
    //     (รวม DRAFT/CANCELLED ที่คนเรียกไม่ใช่เจ้าของ — ไม่บอกว่ามีอยู่)
    // =====================================================
    @ExceptionHandler(AuctionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleAuctionNotFound(
            AuctionNotFoundException ex,
            HttpServletRequest request) {

        ErrorResponse error = new ErrorResponse(
                OffsetDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage(),
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // =====================================================
    // 2. InsufficientBalanceException → 400 Bad Request
    // =====================================================
    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientBalance(
            InsufficientBalanceException ex,
            HttpServletRequest request) {

        Map<String, String> details = new HashMap<>();
        details.put("currentBalance", ex.getCurrentBalance().toString());
        details.put("requestedAmount", ex.getRequestedAmount().toString());

        ErrorResponse error = new ErrorResponse(
                OffsetDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Insufficient Balance",
                ex.getMessage(),
                request.getRequestURI(),
                details
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // =====================================================
    // 3. Validation errors (@Valid fail) → 400 Bad Request
    // =====================================================
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {

        Map<String, String> details = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fieldError ->
                details.put(fieldError.getField(), fieldError.getDefaultMessage())
        );

        ErrorResponse error = new ErrorResponse(
                OffsetDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed",
                "Invalid input data",
                request.getRequestURI(),
                details
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

	// =====================================================
	// 4. NoResourceFoundException → 404 Not Found
	// =====================================================
	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ErrorResponse> handleNoResourceFound(
			NoResourceFoundException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.NOT_FOUND.value(),
				"Not Found",
				"Endpoint not found",
				request.getRequestURI(),
				null
		);

		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
	}
    // =====================================================
    // 5. อื่น ๆ ทั้งหมด → 500 Internal Server Error
    // =====================================================
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex,
            HttpServletRequest request) {

		log.error("Unexpected error at {}: {}", request.getRequestURI(), ex.getMessage(), ex);  // ← log stack trace
        ErrorResponse error = new ErrorResponse(
                OffsetDateTime.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "Something went wrong. Please try again later.",
                request.getRequestURI(),
                null
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

	// =====================================================
	// 6. IllegalArgumentException → 400 Bad Request
	// =====================================================
	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ErrorResponse> handleIllegalArgument(
			IllegalArgumentException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.BAD_REQUEST.value(),
				"Bad Request",
				ex.getMessage(),
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
	}

	// =====================================================
	// 6.1 MethodArgumentTypeMismatchException → 400 Bad Request
	//     (เช่น ?status=FOO ที่แปลงเป็น enum ไม่ได้)
	// =====================================================
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErrorResponse> handleTypeMismatch(
			MethodArgumentTypeMismatchException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.BAD_REQUEST.value(),
				"Bad Request",
				"Invalid value for parameter '" + ex.getName() + "'",
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
	}

	// =====================================================
	// 6.2 ไฟล์อัปโหลดใหญ่เกิน spring.servlet.multipart.max-file-size → 413
	// =====================================================
	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ErrorResponse> handleMaxUploadSize(
			MaxUploadSizeExceededException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.CONTENT_TOO_LARGE.value(),
				"Payload Too Large",
				"File must be at most 5 MB",
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE).body(error);
	}

	// =====================================================
	// 6.3 ไม่ได้ส่ง multipart / ไม่มี part "file" → 400
	// =====================================================
	@ExceptionHandler({MultipartException.class, MissingServletRequestPartException.class})
	public ResponseEntity<ErrorResponse> handleBadMultipart(
			Exception ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.BAD_REQUEST.value(),
				"Bad Request",
				"Request must be multipart/form-data with a 'file' part",
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
	}

	// =====================================================
	// 6.4 ไม่ได้ส่ง body / body ไม่ใช่ JSON ที่อ่านได้ → 400
	//     ไม่ส่งข้อความของ parser กลับไป (มีชื่อ class / method ภายใน)
	//     ถ้าไม่มีตัวนี้ ตัวจับทั่วไป (Exception) จะเปลี่ยนเป็น 500
	// =====================================================
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleNotReadable(
			HttpMessageNotReadableException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.BAD_REQUEST.value(),
				"Bad Request",
				"Request body is missing or is not valid JSON",
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
	}

	// =====================================================
	// 6.5 method ที่ endpoint ไม่รองรับ → 405 (พร้อม header Allow)
	// =====================================================
	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ErrorResponse> handleMethodNotSupported(
			HttpRequestMethodNotSupportedException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.METHOD_NOT_ALLOWED.value(),
				"Method Not Allowed",
				"Request method '" + ex.getMethod() + "' is not supported",
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).headers(ex.getHeaders()).body(error);
	}

	// =====================================================
	// 6.6 Content-Type ที่ endpoint ไม่รองรับ → 415 (พร้อม header Accept)
	// =====================================================
	@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
	public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(
			HttpMediaTypeNotSupportedException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.UNSUPPORTED_MEDIA_TYPE.value(),
				"Unsupported Media Type",
				"Content-Type is not supported by this endpoint",
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).headers(ex.getHeaders()).body(error);
	}

	// =====================================================
	// 7. BadCredentialsException → 401 Unauthorized
	// =====================================================
	@ExceptionHandler(BadCredentialsException.class)
	public ResponseEntity<ErrorResponse> handleBadCredentials(
			BadCredentialsException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.UNAUTHORIZED.value(),
				"Unauthorized",
				ex.getMessage(),
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
	}

	// =====================================================
	// 7.1 ResponseStatusException → status ที่ระบุไว้ (เช่น 403 ถูกระงับ, 409 ซ้ำ/ใช้อยู่, 503 ยังไม่ได้ตั้งค่า)
	//     ถ้าไม่มีตัวนี้ ตัวจับทั่วไป (Exception) จะเปลี่ยนเป็น 500
	// =====================================================
	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<ErrorResponse> handleResponseStatus(
			ResponseStatusException ex,
			HttpServletRequest request) {

		HttpStatusCode status = ex.getStatusCode();
		HttpStatus known = HttpStatus.resolve(status.value());
		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				status.value(),
				known != null ? known.getReasonPhrase() : "Error",
				ex.getReason(),
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(status).body(error);
	}

	// =====================================================
	// 8. AccessDeniedException  → 403 Forbidden
	// =====================================================
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ErrorResponse> handleAccessDenied(
			AccessDeniedException ex,
			HttpServletRequest request) {

		ErrorResponse error = new ErrorResponse(
				OffsetDateTime.now(),
				HttpStatus.FORBIDDEN.value(),
				"Forbidden",
				ex.getMessage(),
				request.getRequestURI(),
				null
		);
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
	}
}