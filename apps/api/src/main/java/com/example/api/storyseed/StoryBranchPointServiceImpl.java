package com.example.api.storyseed;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.common.ApiException;
import com.example.api.story.Story;
import com.example.api.story.StoryRepository;
import com.example.api.storyseed.dto.StoryBranchPointCreateRequest;
import com.example.api.storyseed.dto.StoryBranchPointResponse;
import com.example.api.storyseed.dto.StoryBranchPointUpdateRequest;
import com.example.api.storyseed.dto.StoryOptionResponse;

@Service
public class StoryBranchPointServiceImpl implements StoryBranchPointService {

    private final StoryRepository storyRepository;
    private final StoryBranchPointRepository storyBranchPointRepository;
    private final StoryOptionRepository storyOptionRepository;

    public StoryBranchPointServiceImpl(StoryRepository storyRepository,
            StoryBranchPointRepository storyBranchPointRepository,
            StoryOptionRepository storyOptionRepository) {
        this.storyRepository = storyRepository;
        this.storyBranchPointRepository = storyBranchPointRepository;
        this.storyOptionRepository = storyOptionRepository;
    }

    @Override
    @Transactional
    public StoryBranchPointResponse create(String username, Long storyId, StoryBranchPointCreateRequest request) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));


        StoryBranchPoint point = new StoryBranchPoint(story, request.sortOrder());
        point.setAnchorText(request.anchorText() != null ? request.anchorText().trim() : null);
        StoryBranchPoint saved = storyBranchPointRepository.save(point);

        if (request.options() != null && !request.options().isEmpty()) {
            int idx = 0;
            for (StoryBranchPointCreateRequest.StoryOptionItem item : request.options()) {
                StoryOption opt = new StoryOption(saved, item.label(), item.sortOrder());
                opt.setInfluenceNotes(item.influenceNotes() != null ? item.influenceNotes().trim() : null);
                storyOptionRepository.save(opt);
                idx++;
            }
        }

        return toResponse(storyBranchPointRepository.findById(saved.getId()).orElseThrow(), storyId);
    }

    @Override
    @Transactional
    public StoryBranchPointResponse update(String username, Long storyId, Long branchPointId, StoryBranchPointUpdateRequest request) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        
        StoryBranchPoint point = storyBranchPointRepository.findById(branchPointId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支点不存在"));
        if (point.getStory() == null || !point.getStory().getId().equals(storyId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "分支点不存在");
        }

        point.setSortOrder(request.sortOrder());
        point.setAnchorText(request.anchorText() != null ? request.anchorText().trim() : null);

        List<StoryOption> existing = storyOptionRepository.findByBranchPoint_IdOrderBySortOrderAsc(point.getId());
        storyOptionRepository.deleteAll(existing);

        if (request.options() != null && !request.options().isEmpty()) {
            for (StoryBranchPointUpdateRequest.StoryOptionItem item : request.options()) {
                StoryOption opt = new StoryOption(point, item.label(), item.sortOrder());
                opt.setInfluenceNotes(item.influenceNotes() != null ? item.influenceNotes().trim() : null);
                storyOptionRepository.save(opt);
            }
        }

        return toResponse(storyBranchPointRepository.findById(branchPointId).orElseThrow(), storyId);
    }

    @Override
    @Transactional
    public void delete(String username, Long storyId, Long branchPointId) {
        Story story = storyRepository.findByIdAndAuthorUsername(storyId, username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "故事不存在"));
        
        StoryBranchPoint point = storyBranchPointRepository.findById(branchPointId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分支点不存在"));
        if (point.getStory() == null || !point.getStory().getId().equals(storyId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "分支点不存在");
        }
        storyBranchPointRepository.delete(point);
    }

    private StoryBranchPointResponse toResponse(StoryBranchPoint point, Long storyId) {
        List<StoryOptionResponse> options = storyOptionRepository
                .findByBranchPoint_IdOrderBySortOrderAsc(point.getId()).stream()
                .map(opt -> new StoryOptionResponse(
                        opt.getId(),
                        opt.getBranchPoint().getId(),
                        opt.getLabel(),
                        opt.getSortOrder(),
                        opt.getInfluenceNotes()))
                .toList();
        return new StoryBranchPointResponse(
                point.getId(),
                storyId,
                point.getSortOrder(),
                point.getAnchorText(),
                options);
    }
}
