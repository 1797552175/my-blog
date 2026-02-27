package com.example.api.storyseed;

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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.storyseed.dto.StorySeedCreateRequest;
import com.example.api.storyseed.dto.StorySeedListItemResponse;
import com.example.api.storyseed.dto.StorySeedResponse;
import com.example.api.storyseed.dto.StorySeedUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/story-seeds")
public class StorySeedController {

    private final StorySeedService storySeedService;

    public StorySeedController(StorySeedService storySeedService) {
        this.storySeedService = storySeedService;
    }

    @GetMapping
    public Page<StorySeedListItemResponse> listPublished(@PageableDefault(size = 10) Pageable pageable) {
        return storySeedService.listPublished(pageable);
    }

    @GetMapping("/slug/{slug}")
    public StorySeedResponse getBySlug(@PathVariable String slug) {
        return storySeedService.getBySlug(slug);
    }

    @GetMapping("/me")
    public java.util.List<StorySeedListItemResponse> listMine(
            @AuthenticationPrincipal UserDetails user) {
        return storySeedService.listMineAll(user.getUsername());
    }

    @GetMapping("/{id}")
    public StorySeedResponse getById(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return storySeedService.getByIdForAuthor(user.getUsername(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StorySeedResponse create(@AuthenticationPrincipal UserDetails user, @Valid @RequestBody StorySeedCreateRequest request) {
        System.out.println("DEBUG Controller: received published=" + request.published());
        return storySeedService.create(user.getUsername(), request);
    }

    @PutMapping("/{id}")
    public StorySeedResponse update(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long id,
            @Valid @RequestBody StorySeedUpdateRequest request) {
        return storySeedService.update(user.getUsername(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        storySeedService.delete(user.getUsername(), id);
    }
}
