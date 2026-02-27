package com.example.api.tag;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.story.StoryRepository;

@Service
public class TagServiceImpl implements TagService {

    private final StoryRepository storyRepository;

    public TagServiceImpl(StoryRepository storyRepository) {
        this.storyRepository = storyRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TagResponse> listAllWithCount() {
        List<Object[]> rows = storyRepository.findAllTagCounts();
        return rows.stream()
                .map(row -> new TagResponse((String) row[0], ((Number) row[1]).longValue()))
                .toList();
    }
}
