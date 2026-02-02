package com.example.api.post;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.api.post.dto.PostCreateRequest;
import com.example.api.post.dto.PostResponse;
import com.example.api.post.dto.PostUpdateRequest;

public interface PostService {

    Page<PostResponse> listPublished(Pageable pageable);

    Page<PostResponse> listMine(String username, Pageable pageable);

    PostResponse getBySlug(String slug);

    PostResponse create(String username, PostCreateRequest request);

    PostResponse update(String username, Long id, PostUpdateRequest request);

    void delete(String username, Long id);

}
