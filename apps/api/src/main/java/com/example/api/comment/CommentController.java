package com.example.api.comment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.comment.dto.CommentCreateRequest;
import com.example.api.comment.dto.CommentResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/posts")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/{postId}/comments")
    public Page<CommentResponse> listComments(
            @PathVariable Long postId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return commentService.listByPostId(postId, pageable);
    }

    @PostMapping("/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse createComment(
            @AuthenticationPrincipal(expression = "username") String username,
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateRequest request) {
        String user = (username != null && !username.isBlank()) ? username : null;
        return commentService.create(postId, user, request);
    }
}
