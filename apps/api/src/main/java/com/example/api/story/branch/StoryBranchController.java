package com.example.api.story.branch;

import com.example.api.story.branch.dto.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stories/{storyId}/branches")
public class StoryBranchController {

    private final StoryBranchService branchService;

    public StoryBranchController(StoryBranchService branchService) {
        this.branchService = branchService;
    }

    /**
     * 获取完整分支树
     */
    @GetMapping("/tree")
    public List<ChapterNodeResponse> getBranchTree(@PathVariable Long storyId) {
        return branchService.getBranchTree(storyId);
    }

    /**
     * 获取主线
     */
    @GetMapping("/mainline")
    public List<ChapterNodeResponse> getMainline(@PathVariable Long storyId) {
        return branchService.getMainline(storyId);
    }

    /**
     * 获取某个章节的子分支
     */
    @GetMapping("/chapter/{chapterId}/children")
    public List<ChapterNodeResponse> getChildBranches(@PathVariable Long storyId, @PathVariable Long chapterId) {
        return branchService.getChildBranches(chapterId);
    }

    /**
     * 获取某个章节的后代树
     */
    @GetMapping("/chapter/{chapterId}/descendants")
    public List<ChapterNodeResponse> getDescendantTree(@PathVariable Long storyId, @PathVariable Long chapterId) {
        return branchService.getDescendantTree(chapterId);
    }

    /**
     * 获取某个章节的祖先链
     */
    @GetMapping("/chapter/{chapterId}/ancestors")
    public List<ChapterNodeResponse> getAncestorChain(@PathVariable Long storyId, @PathVariable Long chapterId) {
        return branchService.getAncestorChain(chapterId);
    }

    /**
     * 获取某个作者的分支
     */
    @GetMapping("/author/{authorId}")
    public List<ChapterNodeResponse> getAuthorBranches(@PathVariable Long storyId, @PathVariable Long authorId) {
        return branchService.getAuthorBranches(storyId, authorId);
    }

    /**
     * 获取分支统计
     */
    @GetMapping("/stats")
    public BranchStatsResponse getBranchStats(@PathVariable Long storyId) {
        return branchService.getBranchStats(storyId);
    }
}
