package com.example.api.tag;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.api.post.PostRepository;

@Service
public class TagServiceImpl implements TagService {

    private final PostRepository postRepository;

    public TagServiceImpl(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TagResponse> listAllWithCount() {
        List<Object[]> rows = postRepository.findAllTagCounts();
        return rows.stream()
                .map(row -> new TagResponse((String) row[0], ((Number) row[1]).longValue()))
                .toList();
    }
}
