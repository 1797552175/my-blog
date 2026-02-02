package com.example.api.post;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.common.ApiException;
import com.example.api.common.SlugUtil;
import com.example.api.post.dto.PostCreateRequest;
import com.example.api.post.dto.PostResponse;
import com.example.api.post.dto.PostUpdateRequest;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

@Service
public class PostServiceImpl implements PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public PostServiceImpl(PostRepository postRepository, UserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> listPublished(Pageable pageable) {
        return postRepository.findByPublishedTrue(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponse> listMine(String username, Pageable pageable) {
        return postRepository.findByAuthor_Username(username, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PostResponse getBySlug(String slug) {
        Post post = postRepository.findBySlug(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "post_not_found"));
        if (!post.isPublished()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "post_not_found");
        }
        return toResponse(post);
    }

    @Override
    @Transactional
    public PostResponse create(String username, PostCreateRequest request) {
        User author = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "user_not_found"));

        String baseSlug = SlugUtil.slugify(request.title());
        if (baseSlug.isBlank()) {
            baseSlug = "post";
        }
        String slug = ensureUniqueSlug(baseSlug);

        Post post = new Post(request.title(), slug, request.contentMarkdown(), request.published(), author);
        Post saved = postRepository.save(post);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public PostResponse update(String username, Long id, PostUpdateRequest request) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "post_not_found"));

        if (!post.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "forbidden");
        }

        post.setTitle(request.title());
        post.setContentMarkdown(request.contentMarkdown());
        post.setPublished(request.published());

        return toResponse(post);
    }

    @Override
    @Transactional
    public void delete(String username, Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "post_not_found"));

        if (!post.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "forbidden");
        }

        postRepository.delete(post);
    }

    private PostResponse toResponse(Post post) {
        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getSlug(),
                post.getContentMarkdown(),
                post.isPublished(),
                post.getAuthor().getUsername(),
                post.getCreatedAt(),
                post.getUpdatedAt());
    }

    private String ensureUniqueSlug(String baseSlug) {
        String slug = baseSlug;
        int counter = 2;
        while (postRepository.findBySlug(slug).isPresent()) {
            if (counter <= 5) {
                slug = baseSlug + "-" + counter;
                counter++;
            } else {
                slug = baseSlug + "-" + UUID.randomUUID().toString().substring(0, 8);
            }
        }
        return slug;
    }
}
