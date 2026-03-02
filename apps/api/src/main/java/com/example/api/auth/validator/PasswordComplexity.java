package com.example.api.auth.validator;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordComplexityValidator.class)
@Documented
public @interface PasswordComplexity {
    String message() default "密码必须包含字母和数字，长度至少8位";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
