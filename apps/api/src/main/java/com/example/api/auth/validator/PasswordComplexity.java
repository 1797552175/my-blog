package com.example.api.auth.validator;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordComplexityValidator.class)
@Documented
public @interface PasswordComplexity {
    String message() default "密码必须包含大小写字母、数字和特殊字符，长度至少8位";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
