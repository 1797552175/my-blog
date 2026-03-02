package com.example.api.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.auth.dto.AuthResponse;
import com.example.api.auth.dto.BindPhoneRequest;
import com.example.api.auth.dto.ChangePasswordRequest;
import com.example.api.auth.dto.LoginRequest;
import com.example.api.auth.dto.RegisterRequest;
import com.example.api.auth.dto.RegisterResponse;
import com.example.api.auth.dto.UpdateProfileRequest;
import com.example.api.auth.dto.UserMeResponse;
import com.example.api.common.ApiException;
import com.example.api.security.JwtTokenProvider;
import com.example.api.sms.SmsScene;
import com.example.api.sms.SmsService;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtTokenProvider jwtTokenProvider;
    private static UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SmsService smsService;

    public AuthController(
            JwtTokenProvider jwtTokenProvider,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            SmsService smsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        AuthController.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.smsService = smsService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        String phone = SmsService.normalizePhone(request.phone());
        if (!SmsService.isValidChineseMobile(request.phone())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请输入正确的手机号");
        }
        if (!smsService.verifyCode(phone, SmsScene.LOGIN_REGISTER, request.smsCode())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "验证码错误或已过期");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new ApiException(HttpStatus.CONFLICT, "用户名已被使用");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "邮箱已被使用");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new ApiException(HttpStatus.CONFLICT, "该手机号已注册");
        }

        User user = new User(request.username(), request.email(), passwordEncoder.encode(request.password()));
        user.setPhone(phone);
        User savedUser = userRepository.save(user);
        return new RegisterResponse(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByUsername(request.username()).orElse(null);
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "账户未注册");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "密码错误");
        }
        String token = jwtTokenProvider.generateToken(user);
        return new AuthResponse(token, user.getUsername());
    }

    @GetMapping("/me")
    public UserMeResponse me() {
        User user = currentUser();
        return new UserMeResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getPersonaPrompt(),
                user.isPersonaEnabled(),
                user.getDefaultAiModel(),
                user.isAdmin());
    }

    @PutMapping("/me")
    public UserMeResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        User user = currentUser();
        boolean changed = false;
        if (request.email() != null && !request.email().isBlank()) {
            if (!request.email().equals(user.getEmail()) && userRepository.existsByEmail(request.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "邮箱已被使用");
            }
            user.setEmail(request.email());
            changed = true;
        }
        if (request.personaPrompt() != null) {
            user.setPersonaPrompt(request.personaPrompt().isBlank() ? null : request.personaPrompt().trim());
            changed = true;
        }
        if (request.personaEnabled() != null) {
            user.setPersonaEnabled(request.personaEnabled());
            changed = true;
        }
        if (request.defaultAiModel() != null) {
            user.setDefaultAiModel(request.defaultAiModel().isBlank() ? null : request.defaultAiModel().trim());
            changed = true;
        }
        if (changed) {
            userRepository.save(user);
        }
        return new UserMeResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getPersonaPrompt(),
                user.isPersonaEnabled(),
                user.getDefaultAiModel(),
                user.isAdmin());
    }

    @PutMapping("/me/phone")
    public UserMeResponse bindOrChangePhone(@Valid @RequestBody BindPhoneRequest request) {
        User user = currentUser();
        String phone = SmsService.normalizePhone(request.phone());
        if (!SmsService.isValidChineseMobile(request.phone())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请输入正确的手机号");
        }
        boolean isChange = user.getPhone() != null && !user.getPhone().isBlank();
        SmsScene scene = isChange ? SmsScene.CHANGE_PHONE : SmsScene.BIND_PHONE;
        if (!smsService.verifyCode(phone, scene, request.code())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "验证码错误或已过期");
        }
        if (userRepository.existsByPhone(phone) && !phone.equals(user.getPhone())) {
            throw new ApiException(HttpStatus.CONFLICT, "该手机号已被其他账号绑定");
        }
        user.setPhone(phone);
        userRepository.save(user);
        return new UserMeResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getPersonaPrompt(),
                user.isPersonaEnabled(),
                user.getDefaultAiModel(),
                user.isAdmin());
    }

    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User user = currentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "当前密码错误");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    public static User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }
        String username = ((org.springframework.security.core.userdetails.UserDetails) auth.getPrincipal()).getUsername();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));
    }
}
