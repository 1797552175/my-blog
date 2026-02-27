package com.example.api.readerfork.dto;

import java.time.Instant;

public record ReaderForkResponse(
        Long id,
        Long storySeedId,
        String storySeedTitle,
        String storySeedSlug,
        /** 从第几章开始续写（作者章节序号），null 表示从开头 */
        Integer fromChapterSortOrder,
        /** 最后阅读的章节ID */
        Long lastReadCommitId,
        Long readerId,
        String readerUsername,
        String title,
        Instant createdAt,
        Instant updatedAt
) {
}
