package com.example.api.story.branch;

import com.example.api.story.Story;
import com.example.api.story.StoryChapter;
import com.example.api.story.StoryChapterRepository;
import com.example.api.story.StoryRepository;
import com.example.api.story.branch.dto.*;
import com.example.api.user.User;
import com.example.api.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 故事分支服务：管理树形章节结构
 */
@Service
public class StoryBranchService {

    private final StoryChapterRepository chapterRepository;
    private final StoryRepository storyRepository;
    private final UserRepository userRepository;

    public StoryBranchService(StoryChapterRepository chapterRepository,
                              StoryRepository storyRepository,
                              UserRepository userRepository) {
        this.chapterRepository = chapterRepository;
        this.storyRepository = storyRepository;
        this.userRepository = userRepository;
    }

    /**
     * 获取小说的完整分支树
     */
    @Transactional(readOnly = true)
    public List<ChapterNodeResponse> getBranchTree(Long storyId) {
        List<StoryChapter> allChapters = chapterRepository.findByStoryIdOrderBySortOrderAsc(storyId);
        return buildTree(allChapters);
    }

    /**
     * 获取小说的主线
     */
    @Transactional(readOnly = true)
    public List<ChapterNodeResponse> getMainline(Long storyId) {
        List<StoryChapter> mainlineChapters = chapterRepository.findByStoryIdAndIsMainlineTrueOrderBySortOrderAsc(storyId);
        return mainlineChapters.stream()
                .map(this::convertToNode)
                .collect(Collectors.toList());
    }

    /**
     * 获取某个章节的所有子分支
     */
    @Transactional(readOnly = true)
    public List<ChapterNodeResponse> getChildBranches(Long chapterId) {
        List<StoryChapter> children = chapterRepository.findByParentChapterIdOrderBySortOrderAsc(chapterId);
        return children.stream()
                .map(this::convertToNode)
                .collect(Collectors.toList());
    }

    /**
     * 获取某个章节的完整后代树
     */
    @Transactional(readOnly = true)
    public List<ChapterNodeResponse> getDescendantTree(Long chapterId) {
        List<StoryChapter> descendants = chapterRepository.findAllDescendants(chapterId);
        return buildTree(descendants);
    }

    /**
     * 获取某个章节的祖先链（面包屑）
     */
    @Transactional(readOnly = true)
    public List<ChapterNodeResponse> getAncestorChain(Long chapterId) {
        List<StoryChapter> ancestors = chapterRepository.findAncestorChain(chapterId);
        return ancestors.stream()
                .map(this::convertToNode)
                .collect(Collectors.toList());
    }

    /**
     * 获取某个作者的所有分支
     */
    @Transactional(readOnly = true)
    public List<ChapterNodeResponse> getAuthorBranches(Long storyId, Long authorId) {
        List<StoryChapter> authorChapters = chapterRepository.findByStoryIdAndAuthorIdOrderBySortOrderAsc(storyId, authorId);
        return buildTree(authorChapters);
    }

    /**
     * 获取分支统计信息
     */
    @Transactional(readOnly = true)
    public BranchStatsResponse getBranchStats(Long storyId) {
        List<StoryChapter> allChapters = chapterRepository.findByStoryIdOrderBySortOrderAsc(storyId);
        List<StoryChapter> mainlineChapters = chapterRepository.findByStoryIdAndIsMainlineTrueOrderBySortOrderAsc(storyId);

        int totalChapters = allChapters.size();
        int mainlineChapters_count = mainlineChapters.size();
        int branchChapters = totalChapters - mainlineChapters_count;

        // 统计分支点（有子章节的章节）
        Set<Long> parentIds = allChapters.stream()
                .map(c -> c.getParentChapter() != null ? c.getParentChapter().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        int branchPoints = parentIds.size();

        // 统计作者数
        int authorCount = chapterRepository.countDistinctAuthorsByStoryId(storyId);

        return new BranchStatsResponse(
                totalChapters,
                mainlineChapters_count,
                branchChapters,
                branchPoints,
                authorCount
        );
    }

    /**
     * 构建树形结构
     */
    private List<ChapterNodeResponse> buildTree(List<StoryChapter> chapters) {
        Map<Long, ChapterNodeResponse> nodeMap = new HashMap<>();
        List<ChapterNodeResponse> rootNodes = new ArrayList<>();

        // 首先创建所有节点
        for (StoryChapter chapter : chapters) {
            ChapterNodeResponse node = convertToNode(chapter);
            nodeMap.put(chapter.getId(), node);
        }

        // 然后建立父子关系
        for (StoryChapter chapter : chapters) {
            ChapterNodeResponse node = nodeMap.get(chapter.getId());
            if (chapter.getParentChapter() == null) {
                // 根节点
                rootNodes.add(node);
            } else {
                // 子节点
                ChapterNodeResponse parentNode = nodeMap.get(chapter.getParentChapter().getId());
                if (parentNode != null) {
                    parentNode.children().add(node);
                } else {
                    // 父节点不在当前列表中，作为根节点
                    rootNodes.add(node);
                }
            }
        }

        return rootNodes;
    }

    /**
     * 转换为节点响应
     */
    private ChapterNodeResponse convertToNode(StoryChapter chapter) {
        return new ChapterNodeResponse(
                chapter.getId(),
                chapter.getTitle(),
                chapter.getSortOrder(),
                chapter.getAuthor() != null ? chapter.getAuthor().getId() : null,
                chapter.getAuthor() != null ? chapter.getAuthor().getUsername() : null,
                chapter.getParentChapter() != null ? chapter.getParentChapter().getId() : null,
                chapter.getIsMainline(),
                chapter.getBranchName(),
                chapter.getWordCount(),
                chapter.getCreatedAt(),
                new ArrayList<>() // children
        );
    }
}
