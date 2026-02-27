package com.example.api.story;

import com.example.api.story.dto.ContributorResponse;
import com.example.api.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 贡献者统计服务
 */
@Service
public class StoryContributorService {

    private final StoryChapterRepository chapterRepository;
    private final StoryRepository storyRepository;

    public StoryContributorService(StoryChapterRepository chapterRepository, StoryRepository storyRepository) {
        this.chapterRepository = chapterRepository;
        this.storyRepository = storyRepository;
    }

    /**
     * 获取小说的所有贡献者统计
     */
    @Transactional(readOnly = true)
    public List<ContributorResponse> getContributors(Long storyId) {
        // 获取小说的所有章节
        List<StoryChapter> chapters = chapterRepository.findByStoryIdOrderBySortOrderAsc(storyId);

        // 按作者分组统计
        Map<User, List<StoryChapter>> chaptersByAuthor = chapters.stream()
                .filter(c -> c.getAuthor() != null)
                .collect(Collectors.groupingBy(StoryChapter::getAuthor));

        return chaptersByAuthor.entrySet().stream()
                .map(entry -> {
                    User author = entry.getKey();
                    List<StoryChapter> authorChapters = entry.getValue();

                    int chapterCount = authorChapters.size();
                    int wordCount = authorChapters.stream()
                            .mapToInt(StoryChapter::getWordCount)
                            .sum();

                    var firstChapter = authorChapters.stream()
                            .min(Comparator.comparing(StoryChapter::getCreatedAt))
                            .orElse(null);

                    var lastChapter = authorChapters.stream()
                            .max(Comparator.comparing(StoryChapter::getUpdatedAt))
                            .orElse(null);

                    return new ContributorResponse(
                            author.getId(),
                            author.getUsername(),
                            null, // avatarUrl 暂不支持
                            chapterCount,
                            wordCount,
                            firstChapter != null ? firstChapter.getCreatedAt() : null,
                            lastChapter != null ? lastChapter.getUpdatedAt() : null
                    );
                })
                .sorted(Comparator.comparingInt(ContributorResponse::wordCount).reversed())
                .collect(Collectors.toList());
    }

    /**
     * 获取小说的贡献者数量
     */
    @Transactional(readOnly = true)
    public int getContributorCount(Long storyId) {
        return chapterRepository.countDistinctAuthorsByStoryId(storyId);
    }
}
