package com.example.api.comment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.comment.dto.CommentCreateRequest;
import com.example.api.comment.dto.CommentResponse;
import com.example.api.common.ApiException;
import com.example.api.post.Post;
import com.example.api.post.PostRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

@Service
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public CommentServiceImpl(CommentRepository commentRepository, PostRepository postRepository, UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommentResponse> listByPostId(Long postId, Pageable pageable) {
        if (!postRepository.existsById(postId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "文章不存在");
        }
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public CommentResponse create(Long postId, String usernameOrNull, CommentCreateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "文章不存在"));
        if (!post.isPublished()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "文章不存在");
        }

        Comment comment = new Comment(post, request.content().trim());

        if (usernameOrNull != null && !usernameOrNull.isBlank()) {
            User user = userRepository.findByUsername(usernameOrNull)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "请先登录"));
            comment.setUser(user);
        } else {
            if (request.guestName() == null || request.guestName().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "请填写昵称");
            }
            if (request.guestEmail() == null || request.guestEmail().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "请填写邮箱");
            }
            comment.setGuestName(request.guestName().trim());
            comment.setGuestEmail(request.guestEmail().trim());
            if (request.guestUrl() != null && !request.guestUrl().isBlank()) {
                comment.setGuestUrl(request.guestUrl().trim());
            }
        }

        Comment saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    private CommentResponse toResponse(Comment c) {
        String authorName = c.getUser() != null ? c.getUser().getUsername() : (c.getGuestName() != null ? c.getGuestName() : "匿名");
        return new CommentResponse(c.getId(), authorName, c.getCreatedAt(), c.getContent());
    }
}
