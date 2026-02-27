package com.example.api.storyseed;

import java.util.List;

import com.example.api.storyseed.dto.StoryCharacterCreateRequest;
import com.example.api.storyseed.dto.StoryCharacterResponse;
import com.example.api.storyseed.dto.StoryCharacterUpdateRequest;
import com.example.api.storyseed.dto.StoryReadmeUpdateRequest;
import com.example.api.storyseed.dto.StoryTermCreateRequest;
import com.example.api.storyseed.dto.StoryTermResponse;
import com.example.api.storyseed.dto.StoryTermUpdateRequest;

public interface WorldbuildingService {

    List<StoryCharacterResponse> listCharacters(String username, Long storySeedId);

    StoryCharacterResponse createCharacter(String username, Long storySeedId, StoryCharacterCreateRequest request);

    StoryCharacterResponse updateCharacter(String username, Long storySeedId, Long characterId, StoryCharacterUpdateRequest request);

    void deleteCharacter(String username, Long storySeedId, Long characterId);

    List<StoryTermResponse> listTerms(String username, Long storySeedId);

    StoryTermResponse createTerm(String username, Long storySeedId, StoryTermCreateRequest request);

    StoryTermResponse updateTerm(String username, Long storySeedId, Long termId, StoryTermUpdateRequest request);

    void deleteTerm(String username, Long storySeedId, Long termId);

    String getReadme(String username, Long storySeedId);

    String putReadme(String username, Long storySeedId, StoryReadmeUpdateRequest request);
}
