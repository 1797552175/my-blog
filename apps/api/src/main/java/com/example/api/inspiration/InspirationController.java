package com.example.api.inspiration;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.inspiration.dto.InspirationCreateRequest;
import com.example.api.inspiration.dto.InspirationListItemResponse;
import com.example.api.inspiration.dto.InspirationResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/inspirations")
public class InspirationController {

    private final InspirationService inspirationService;

    public InspirationController(InspirationService inspirationService) {
        this.inspirationService = inspirationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InspirationResponse create(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody InspirationCreateRequest request) {
        return inspirationService.create(user.getUsername(), request);
    }

    @GetMapping
    public Page<InspirationListItemResponse> listMine(
            @AuthenticationPrincipal UserDetails user,
            @PageableDefault(size = 20) Pageable pageable) {
        return inspirationService.listMine(user.getUsername(), pageable);
    }

    @GetMapping("/{id}")
    public InspirationResponse getById(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long id) {
        return inspirationService.getById(user.getUsername(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteById(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long id) {
        inspirationService.deleteById(user.getUsername(), id);
    }
}
