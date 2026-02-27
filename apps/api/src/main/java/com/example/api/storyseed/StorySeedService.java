package com.example.api.storyseed;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.api.storyseed.dto.StorySeedCreateRequest;
import com.example.api.storyseed.dto.StorySeedListItemResponse;
import com.example.api.storyseed.dto.StorySeedResponse;
import com.example.api.storyseed.dto.StorySeedUpdateRequest;

public interface StorySeedService {

    Page<StorySeedListItemResponse> listPublished(Pageable pageable);

    StorySeedResponse getBySlug(String slug);

    Page<StorySeedListItemResponse> listMine(String username, Pageable pageable);

    List<StorySeedListItemResponse> listMineAll(String username);

    StorySeedResponse getByIdForAuthor(String username, Long id);

    StorySeedResponse create(String username, StorySeedCreateRequest request);

    StorySeedResponse update(String username, Long id, StorySeedUpdateRequest request);

    void delete(String username, Long id);
}
