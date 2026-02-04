package com.example.api.inspiration;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.api.inspiration.dto.InspirationCreateRequest;
import com.example.api.inspiration.dto.InspirationListItemResponse;
import com.example.api.inspiration.dto.InspirationResponse;

public interface InspirationService {

    InspirationResponse create(String username, InspirationCreateRequest request);

    Page<InspirationListItemResponse> listMine(String username, Pageable pageable);

    InspirationResponse getById(String username, Long id);

    void deleteById(String username, Long id);
}
