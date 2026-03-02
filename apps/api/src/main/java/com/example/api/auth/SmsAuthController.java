package com.example.api.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.auth.dto.ResetPasswordRequest;
import com.example.api.auth.dto.ResetPasswordSendRequest;
import com.example.api.auth.dto.SendSmsRequest;
import com.example.api.auth.dto.SmsLoginRequest;
import com.example.api.common.ApiException;
import com.example.api.security.JwtTokenProvider;
import com.example.api.sms.SmsScene;
import com.example.api.sms.SmsService;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class SmsAuthController {

    private final SmsService smsService;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public SmsAuthController(SmsService smsService, UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
            PasswordEncoder passwordEncoder) {
        this.smsService = smsService;
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 发送短信验证码。
     * scene 为 BIND_PHONE、CHANGE_PHONE 时需已登录。
     */
    @PostMapping("/sms/send")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void sendSms(@Valid @RequestBody SendSmsRequest request) {
        SmsScene scene = request.scene();
        if (scene == SmsScene.BIND_PHONE || scene == SmsScene.CHANGE_PHONE) {
            try {
                AuthController.currentUser();
            } catch (ApiException e) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
            }
        }
        if (!SmsService.isValidChineseMobile(request.phone())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请输入正确的手机号");
        }
        smsService.sendCode(SmsService.normalizePhone(request.phone()), scene);
    }

    /**
     * 验证码登录（手机号须已绑定账号）。
     */
    @PostMapping("/sms/login")
    public com.example.api.auth.dto.AuthResponse smsLogin(@Valid @RequestBody SmsLoginRequest request) {
        String phone = SmsService.normalizePhone(request.phone());
        if (!SmsService.isValidChineseMobile(request.phone())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请输入正确的手机号");
        }
        if (!smsService.verifyCode(phone, SmsScene.LOGIN_REGISTER, request.code())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "验证码错误或已过期");
        }
        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "该手机号未绑定任何账号，请先注册或使用密码登录"));
        String token = jwtTokenProvider.generateToken(user);
        return new com.example.api.auth.dto.AuthResponse(token, user.getUsername());
    }

    /**
     * 重置密码：请求向手机号发送验证码（模板 100003）。
     */
    @PostMapping("/password/reset-request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPasswordRequest(@Valid @RequestBody ResetPasswordSendRequest request) {
        if (!SmsService.isValidChineseMobile(request.phone())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请输入正确的手机号");
        }
        String phone = SmsService.normalizePhone(request.phone());
        User user = userRepository.findByPhone(phone).orElse(null);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "该手机号未绑定任何账号");
        }
        smsService.sendCode(phone, SmsScene.RESET_PASSWORD);
    }

    /**
     * 重置密码：校验验证码并设置新密码。
     */
    @PostMapping("/password/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        String phone = SmsService.normalizePhone(request.phone());
        if (!SmsService.isValidChineseMobile(request.phone())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请输入正确的手机号");
        }
        if (!smsService.verifyCode(phone, SmsScene.RESET_PASSWORD, request.code())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "验证码错误或已过期");
        }
        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "该手机号未绑定任何账号"));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
