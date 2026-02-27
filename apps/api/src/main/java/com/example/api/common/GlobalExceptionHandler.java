package com.example.api.common;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    /** 仅向客户端返回安全文案，不包含堆栈、异常类型或内部路径等敏感信息。 */
    private static final String INTERNAL_ERROR_MESSAGE = "服务器内部错误";

    private final Environment environment;

    public GlobalExceptionHandler(Environment environment) {
        this.environment = environment;
    }

    /** 开发/本地环境时在 500 响应中附带异常信息，便于排查 */
    private boolean isDevOrLocal() {
        if (environment == null) return false;
        String[] profiles = environment.getActiveProfiles();
        return Arrays.stream(profiles).anyMatch(p ->
                "dev".equals(p) || "h2".equals(p) || "local".equals(p) || "default".equals(p));
    }

    private static String getRequestId(HttpServletRequest request) {
        if (request == null) return null;
        Object id = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        return id != null ? id.toString() : null;
    }

    /** 构建统一错误体：error 必选，requestId 可选（便于排查），其它字段按需。 */
    private static Map<String, Object> body(String error, String requestId, Map<String, ?> extra) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("error", error);
        if (requestId != null && !requestId.isBlank()) {
            map.put("requestId", requestId);
        }
        if (extra != null && !extra.isEmpty()) {
            map.putAll(extra);
        }
        return map;
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.getStatus()).body(body(ex.getMessage(), getRequestId(request), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (a, b) -> a));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                body("请检查输入", getRequestId(request), Map.of("fields", fieldErrors)));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidJson(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body("请求体格式错误", getRequestId(request), null));
    }

    @ExceptionHandler({ BadCredentialsException.class })
    public ResponseEntity<Map<String, Object>> handleBadCredentials(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body("用户名或密码错误", getRequestId(request), null));
    }

    @ExceptionHandler({ UsernameNotFoundException.class })
    public ResponseEntity<Map<String, Object>> handleUserNotFound(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body("账户未注册", getRequestId(request), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleOther(Exception ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.error("500 internal_error requestId={}", requestId, ex);
        Map<String, ?> extra = null;
        if (isDevOrLocal()) {
            String detail = ex.getClass().getSimpleName() + ": " + (ex.getMessage() != null ? ex.getMessage() : "");
            extra = Map.of("detail", detail);
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(body(INTERNAL_ERROR_MESSAGE, requestId, extra));
    }
}
