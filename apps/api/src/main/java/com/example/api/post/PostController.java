package com.example.api.post;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.data.domain.Sort;

import com.example.api.post.dto.PostCreateRequest;
import com.example.api.post.dto.PostResponse;
import com.example.api.post.dto.PostUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public Page<PostResponse> listPublished(
            @RequestParam(required = false) String tag,
            @PageableDefault(size = 10) Pageable pageable) {
        if (tag != null && !tag.isBlank()) {
            return postService.listPublished(tag.trim(), pageable);
        }
        return postService.listPublished(pageable);
    }

    @GetMapping("/slug/{slug}")
    public PostResponse getBySlug(@PathVariable String slug) {
        return postService.getBySlug(slug);
    }

    @GetMapping("/search")
    public Page<PostResponse> search(
            @RequestParam(required = false) String q,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return postService.search(q != null ? q.trim() : null, pageable);
    }

    @GetMapping("/{id}")
    public PostResponse getById(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return postService.getByIdForAuthor(user.getUsername(), id);
    }

    @GetMapping("/me")
    public Page<PostResponse> listMine(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) String tag,
            @PageableDefault(size = 10) Pageable pageable) {
        if (tag != null && !tag.isBlank()) {
            return postService.listMine(user.getUsername(), tag.trim(), pageable);
        }
        return postService.listMine(user.getUsername(), pageable);
    }

    @GetMapping("/me/tags")
    public java.util.List<String> listMyTags(@AuthenticationPrincipal UserDetails user) {
        return postService.listMyTags(user.getUsername());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(@AuthenticationPrincipal UserDetails user, @Valid @RequestBody PostCreateRequest request) {
        return postService.create(user.getUsername(), request);
    }

    @PutMapping("/{id}")
    public PostResponse update(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long id,
            @Valid @RequestBody PostUpdateRequest request) {
        return postService.update(user.getUsername(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        postService.delete(user.getUsername(), id);
    }

}
