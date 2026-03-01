package com.example.api.story;

import com.example.api.story.dto.*;

import java.util.List;

public interface StoryPrNovelService {

    StoryPrNovelResponse create(String username, StoryPrNovelCreateRequest request);

    StoryPrNovelResponse update(String username, Long prNovelId, StoryPrNovelUpdateRequest request);

    void delete(String username, Long prNovelId);

    StoryPrNovelResponse getById(String username, Long prNovelId);

    List<StoryPrNovelResponse> listMyPrNovels(String username);

    List<StoryPrNovelResponse> listPrNovelsByStory(String username, Long storyId);

    StoryPrChapterResponse addChapter(String username, Long prNovelId, StoryPrChapterCreateRequest request);

    StoryPrChapterResponse updateChapter(String username, Long prNovelId, Long chapterId, StoryPrChapterCreateRequest request);

    void deleteChapter(String username, Long prNovelId, Long chapterId);

    List<StoryPrChapterResponse> listChapters(String username, Long prNovelId);

    StoryPrSubmissionResponse submit(String username, StoryPrSubmissionCreateRequest request);

    List<StoryPrSubmissionResponse> listMySubmissions(String username);

    List<StoryPrSubmissionResponse> listReceivedSubmissions(String username);

    StoryPrSubmissionResponse review(String username, Long submissionId, StoryPrSubmissionReviewRequest request);
}
