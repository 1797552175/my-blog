package com.example.api.auth.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordComplexityValidator implements ConstraintValidator<PasswordComplexity, String> {
    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return false;
        }
        
        // 检查密码长度
        if (password.length() < 8) {
            return false;
        }
        
        // 检查是否包含字母
        if (!password.matches(".*[a-zA-Z].*")) {
            return false;
        }
        
        // 检查是否包含数字
        if (!password.matches(".*[0-9].*")) {
            return false;
        }
        
        return true;
    }
}
