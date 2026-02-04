package com.example.api.post;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.api.post.dto.PostCreateRequest;
import com.example.api.post.dto.PostResponse;
import com.example.api.post.dto.PostUpdateRequest;

public interface PostService {

    Page<PostResponse> listPublished(Pageable pageable);

    Page<PostResponse> listPublished(String tag, Pageable pageable);

    Page<PostResponse> search(String q, Pageable pageable);

    Page<PostResponse> listMine(String username, Pageable pageable);

    Page<PostResponse> listMine(String username, String tag, Pageable pageable);

    java.util.List<String> listMyTags(String username);

    PostResponse getBySlug(String slug);

    PostResponse getByIdForAuthor(String username, Long id);

    PostResponse create(String username, PostCreateRequest request);

    PostResponse update(String username, Long id, PostUpdateRequest request);

    void delete(String username, Long id);

}
