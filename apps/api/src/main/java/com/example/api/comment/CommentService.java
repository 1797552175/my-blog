package com.example.api.comment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.api.comment.dto.CommentCreateRequest;
import com.example.api.comment.dto.CommentResponse;

public interface CommentService {

    Page<CommentResponse> listByPostId(Long postId, Pageable pageable);

    CommentResponse create(Long postId, String usernameOrNull, CommentCreateRequest request);
}
