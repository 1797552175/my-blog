package com.example.api.storyseed;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.common.ApiException;
import com.example.api.story.Story;
import com.example.api.story.StoryRepository;
import com.example.api.storyseed.dto.StoryCharacterCreateRequest;
import com.example.api.storyseed.dto.StoryCharacterResponse;
import com.example.api.storyseed.dto.StoryCharacterUpdateRequest;
import com.example.api.storyseed.dto.StoryReadmeUpdateRequest;
import com.example.api.storyseed.dto.StoryTermCreateRequest;
import com.example.api.storyseed.dto.StoryTermResponse;
import com.example.api.storyseed.dto.StoryTermUpdateRequest;

@Service
public class WorldbuildingServiceImpl implements WorldbuildingService {

    private final StoryRepository storyRepository;
    private final StoryCharacterRepository storyCharacterRepository;
    private final StoryTermRepository storyTermRepository;
    private final StoryReadmeRepository storyReadmeRepository;

    public WorldbuildingServiceImpl(StoryRepository storyRepository,
            StoryCharacterRepository storyCharacterRepository,
            StoryTermRepository storyTermRepository,
            StoryReadmeRepository storyReadmeRepository) {
        this.storyRepository = storyRepository;
        this.storyCharacterRepository = storyCharacterRepository;
        this.storyTermRepository = storyTermRepository;
        this.storyReadmeRepository = storyReadmeRepository;
    }

    private void ensureAuthor(String username, Long storyId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        if (!story.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryCharacterResponse> listCharacters(String username, Long storyId) {
        ensureAuthor(username, storyId);
        return storyCharacterRepository.findByStory_IdOrderBySortOrderAsc(storyId).stream()
                .map(this::toCharacterResponse)
                .toList();
    }

    @Override
    @Transactional
    public StoryCharacterResponse createCharacter(String username, Long storyId, StoryCharacterCreateRequest request) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        if (!story.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        StoryCharacter c = new StoryCharacter(story, request.name(), request.sortOrder());
        c.setDescription(request.description() != null ? request.description().trim() : null);
        StoryCharacter saved = storyCharacterRepository.save(c);
        return toCharacterResponse(saved);
    }

    @Override
    @Transactional
    public StoryCharacterResponse updateCharacter(String username, Long storyId, Long characterId, StoryCharacterUpdateRequest request) {
        StoryCharacter c = storyCharacterRepository.findById(characterId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "角色不存在"));
        if (c.getStory() == null || !c.getStory().getId().equals(storyId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "角色不存在");
        }
        if (!c.getStory().getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        c.setName(request.name());
        c.setDescription(request.description() != null ? request.description().trim() : null);
        c.setSortOrder(request.sortOrder());
        return toCharacterResponse(c);
    }

    @Override
    @Transactional
    public void deleteCharacter(String username, Long storyId, Long characterId) {
        StoryCharacter c = storyCharacterRepository.findById(characterId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "角色不存在"));
        if (c.getStory() == null || !c.getStory().getId().equals(storyId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "角色不存在");
        }
        if (!c.getStory().getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        storyCharacterRepository.delete(c);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryTermResponse> listTerms(String username, Long storyId) {
        ensureAuthor(username, storyId);
        return storyTermRepository.findByStory_IdOrderBySortOrderAsc(storyId).stream()
                .map(this::toTermResponse)
                .toList();
    }

    @Override
    @Transactional
    public StoryTermResponse createTerm(String username, Long storyId, StoryTermCreateRequest request) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        if (!story.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        StoryTerm t = new StoryTerm(story, request.termType(), request.name(), request.sortOrder());
        t.setDefinition(request.definition() != null ? request.definition().trim() : null);
        StoryTerm saved = storyTermRepository.save(t);
        return toTermResponse(saved);
    }

    @Override
    @Transactional
    public StoryTermResponse updateTerm(String username, Long storyId, Long termId, StoryTermUpdateRequest request) {
        StoryTerm t = storyTermRepository.findById(termId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "专有名词不存在"));
        if (t.getStory() == null || !t.getStory().getId().equals(storyId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "专有名词不存在");
        }
        if (!t.getStory().getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        t.setTermType(request.termType());
        t.setName(request.name());
        t.setDefinition(request.definition() != null ? request.definition().trim() : null);
        t.setSortOrder(request.sortOrder());
        return toTermResponse(t);
    }

    @Override
    @Transactional
    public void deleteTerm(String username, Long storyId, Long termId) {
        StoryTerm t = storyTermRepository.findById(termId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "专有名词不存在"));
        if (t.getStory() == null || !t.getStory().getId().equals(storyId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "专有名词不存在");
        }
        if (!t.getStory().getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        storyTermRepository.delete(t);
    }

    @Override
    @Transactional(readOnly = true)
    public String getReadme(String username, Long storyId) {
        ensureAuthor(username, storyId);
        return storyReadmeRepository.findByStory_Id(storyId)
                .map(StoryReadme::getContentMarkdown)
                .orElse("");
    }

    @Override
    @Transactional
    public String putReadme(String username, Long storyId, StoryReadmeUpdateRequest request) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        if (!story.getAuthor().getUsername().equals(username)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "无权限");
        }
        StoryReadme readme = storyReadmeRepository.findByStory_Id(storyId)
                .orElseGet(() -> {
                    StoryReadme r = new StoryReadme(story);
                    return storyReadmeRepository.save(r);
                });
        readme.setContentMarkdown(request.contentMarkdown() != null ? request.contentMarkdown() : "");
        storyReadmeRepository.save(readme);
        return readme.getContentMarkdown();
    }

    private StoryCharacterResponse toCharacterResponse(StoryCharacter c) {
        return new StoryCharacterResponse(
                c.getId(),
                c.getStory() != null ? c.getStory().getId() : null,
                c.getName(),
                c.getDescription(),
                c.getSortOrder());
    }

    private StoryTermResponse toTermResponse(StoryTerm t) {
        return new StoryTermResponse(
                t.getId(),
                t.getStory() != null ? t.getStory().getId() : null,
                t.getTermType(),
                t.getName(),
                t.getDefinition(),
                t.getSortOrder());
    }
}
