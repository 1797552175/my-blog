package com.example.api.readerfork;

import java.util.List;

import com.example.api.ai.AiChatService;
import com.example.api.readerfork.dto.BookmarkResponse;
import com.example.api.readerfork.dto.CreateBookmarkRequest;
import com.example.api.readerfork.dto.ReaderForkResponse;
import com.example.api.readerfork.dto.StoryCommitResponse;

public interface ReaderForkService {

    ReaderForkResponse createFork(String username, Long storySeedId);

    /**
     * 根据小说slug创建fork
     * 如果该slug没有对应的story_seed，会自动创建一个
     * @param fromChapterSortOrder 从第几章开始续写（作者章节序号），null 表示从开头
     */
    ReaderForkResponse createForkByStorySlug(String username, String storySlug, Integer fromChapterSortOrder);

    List<ReaderForkResponse> listMyForks(String username);

    ReaderForkResponse getFork(String username, Long forkId);

    List<StoryCommitResponse> listCommits(String username, Long forkId);

    StoryCommitResponse choose(String username, Long forkId, Long branchPointId, Long optionId);

    void rollback(String username, Long forkId, Long commitId);

    /**
     * 更新阅读进度
     * @param username 用户名
     * @param forkId Fork ID
     * @param commitId 最后阅读的章节ID
     */
    void updateReadingProgress(String username, Long forkId, Long commitId);

    /**
     * 流式选择选项并生成章节
     * @param username 用户名
     * @param forkId Fork ID
     * @param branchPointId 分支点ID
     * @param optionId 选项ID
     * @param callback 流式回调
     */
    void streamChoose(String username, Long forkId, Long branchPointId, Long optionId, AiChatService.StreamChatCallback callback);

    List<BookmarkResponse> listBookmarks(String username, Long forkId);

    BookmarkResponse createBookmark(String username, Long forkId, CreateBookmarkRequest request);

    BookmarkResponse updateBookmark(String username, Long forkId, Long bookmarkId, CreateBookmarkRequest request);

    void deleteBookmark(String username, Long forkId, Long bookmarkId);

    void rollbackToBranchPoint(String username, Long forkId, Integer branchPointSortOrder);

    void deleteFork(String username, Long forkId);
}
