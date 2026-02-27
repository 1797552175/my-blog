package com.example.api.common;

import com.example.api.story.*;
import com.example.api.story.wiki.*;
import com.example.api.user.User;
import com.example.api.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;

/**
 * H2 测试数据初始化（仅在 h2 profile 激活时运行）
 */
@Configuration
@Profile("h2")
public class TestDataInitializer {

    @Bean
    CommandLineRunner initTestData(
            UserRepository userRepository,
            StoryRepository storyRepository,
            StoryChapterRepository chapterRepository,
            StoryStarRepository storyStarRepository,
            StoryWikiPageRepository wikiPageRepository,
            StoryWikiCharacterRepository characterRepository,
            StoryWikiTimelineEventRepository timelineEventRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            System.out.println("🚀 初始化测试数据...");

            // 1. 创建测试用户
            User author = new User("author", "author@example.com", passwordEncoder.encode("123456"));
            userRepository.save(author);

            User user1 = new User("zhangsan", "zhangsan@example.com", passwordEncoder.encode("123456"));
            userRepository.save(user1);

            User user2 = new User("lisi", "lisi@example.com", passwordEncoder.encode("123456"));
            userRepository.save(user2);

            User user3 = new User("wangwu", "wangwu@example.com", passwordEncoder.encode("123456"));
            userRepository.save(user3);

            System.out.println("✅ 创建 4 个测试用户");

            // 2. 创建开源小说
            Story story = new Story("修仙世界的多重结局", "xianxia-multiple-endings", true, author);
            story.setStorySummary("这是一个开放世界的修仙小说，每个选择都会导致不同的命运...");
            story.setOpenSource(true);
            story.setOpenSourceLicense("CC_BY_SA");
            storyRepository.save(story);

            System.out.println("✅ 创建开源小说");

            // 3. 创建主线章节（主创）
            StoryChapter ch1 = createChapter(story, author, null, 1, "第一章：初入仙门",
                    "主角从一个普通山村少年，被检测出拥有罕见的灵根，被青云宗收为弟子...", true, chapterRepository);

            StoryChapter ch2 = createChapter(story, author, ch1, 2, "第二章：修炼之路",
                    "在青云宗的日子里，主角刻苦修炼，逐渐展现出惊人的天赋...", true, chapterRepository);

            StoryChapter ch3 = createChapter(story, author, ch2, 3, "第三章：宗门大比",
                    "三年一度的宗门大比开始了，主角必须在比赛中证明自己...", true, chapterRepository);

            StoryChapter ch4_main = createChapter(story, author, ch3, 4, "第四章：正道之路",
                    "主角选择坚持正道，在大比中光明正大地击败所有对手，获得宗门长老赏识...", true, chapterRepository);

            StoryChapter ch5_main = createChapter(story, author, ch4_main, 5, "第五章：飞升成仙",
                    "经过百年修炼，主角终于飞升成仙，成为一代传说...", true, chapterRepository);

            System.out.println("✅ 创建主线 5 章");

            // 4. 创建分支 A（张三的暗黑结局）
            StoryChapter ch4_a = createChapter(story, user1, ch3, 4, "第四章：堕入魔道",
                    "主角在比赛中被陷害，一怒之下堕入魔道，开始复仇之路...", false, chapterRepository);
            ch4_a.setBranchName("张三的暗黑结局线");
            chapterRepository.save(ch4_a);

            StoryChapter ch5_a = createChapter(story, user1, ch4_a, 5, "第五章：魔道至尊",
                    "主角成为魔道至尊，统治整个修仙界，但内心始终空虚...", false, chapterRepository);
            ch5_a.setBranchName("张三的暗黑结局线");
            chapterRepository.save(ch5_a);

            // 5. 创建分支 B（李四的悬疑剧情）
            StoryChapter ch4_b = createChapter(story, user2, ch3, 4, "第四章：神秘遗迹",
                    "主角在大比中发现了一个神秘遗迹，决定前去探索...", false, chapterRepository);
            ch4_b.setBranchName("李四的悬疑剧情线");
            chapterRepository.save(ch4_b);

            StoryChapter ch5_b = createChapter(story, user2, ch4_b, 5, "第五章：上古秘密",
                    "主角揭开了上古时期的惊天秘密，发现修仙界的真相...", false, chapterRepository);
            ch5_b.setBranchName("李四的悬疑剧情线");
            chapterRepository.save(ch5_b);

            // 6. 创建分支 B2（王五从李四的分支继续）
            StoryChapter ch5_b2 = createChapter(story, user3, ch4_b, 5, "第五章：爱情线",
                    "在探索遗迹的过程中，主角遇到了命中注定的她，选择了爱情...", false, chapterRepository);
            ch5_b2.setBranchName("王五的爱情线");
            chapterRepository.save(ch5_b2);

            StoryChapter ch6_b2 = createChapter(story, user3, ch5_b2, 6, "第六章：双宿双飞",
                    "主角和爱人一起隐居山林，过上了幸福的生活...", false, chapterRepository);
            ch6_b2.setBranchName("王五的爱情线");
            chapterRepository.save(ch6_b2);

            System.out.println("✅ 创建 3 条分支线，共 6 章");

            // 7. 添加 Star
            storyStarRepository.save(new StoryStar(story, user1));
            storyStarRepository.save(new StoryStar(story, user2));
            storyStarRepository.save(new StoryStar(story, user3));

            System.out.println("✅ 添加 3 个 Star");

            // 8. 创建 Wiki 页面
            StoryWikiPage worldview = new StoryWikiPage(story, "worldview", "世界观设定");
            worldview.setContentMarkdown("""
                    # 修仙世界设定

                    ## 境界划分
                    1. 炼气期
                    2. 筑基期
                    3. 金丹期
                    4. 元婴期
                    5. 化神期
                    6. 渡劫期
                    7. 大乘期

                    ## 宗门势力
                    - 青云宗（正道第一大宗）
                    - 血魔教（魔道至尊）
                    - 天机阁（情报组织）
                    """);
            worldview.setCategory(StoryWikiPage.WikiCategory.WORLDVIEW);
            wikiPageRepository.save(worldview);

            StoryWikiPage location = new StoryWikiPage(story, "locations", "重要地点");
            location.setContentMarkdown("""
                    # 重要地点

                    ## 青云宗
                    位于青云山脉，是正道第一大宗门。

                    ## 魔域
                    魔道修士的聚集地，充满危险与机遇。

                    ## 上古遗迹
                    隐藏着上古时期的秘密。
                    """);
            location.setCategory(StoryWikiPage.WikiCategory.LOCATION);
            wikiPageRepository.save(location);

            System.out.println("✅ 创建 2 个 Wiki 页面");

            // 9. 创建角色档案
            StoryWikiCharacter protagonist = new StoryWikiCharacter(story, "主角");
            protagonist.setAlias("无名");
            protagonist.setRoleType(StoryWikiCharacter.RoleType.PROTAGONIST);
            protagonist.setAge("18岁（初始）");
            protagonist.setGender("男");
            protagonist.setAppearance("普通山村少年模样，但眼神坚定");
            protagonist.setPersonality("坚韧不拔，重情重义");
            protagonist.setBackground("出身贫寒，但拥有罕见灵根");
            protagonist.setContentMarkdown("""
                    # 主角

                    从一个普通山村少年成长为修仙界的传奇人物。

                    ## 不同结局
                    - 正道线：成为一代仙尊
                    - 魔道线：成为魔道至尊
                    - 爱情线：与爱人隐居
                    """);
            characterRepository.save(protagonist);

            StoryWikiCharacter loveInterest = new StoryWikiCharacter(story, "林雪儿");
            loveInterest.setRoleType(StoryWikiCharacter.RoleType.LOVE_INTEREST);
            loveInterest.setAge("16岁");
            loveInterest.setGender("女");
            loveInterest.setAppearance("白衣如雪，清丽脱俗");
            loveInterest.setPersonality("温柔善良，但有自己的坚持");
            loveInterest.setBackground("青云宗掌门之女");
            characterRepository.save(loveInterest);

            StoryWikiCharacter villain = new StoryWikiCharacter(story, "血魔老祖");
            villain.setRoleType(StoryWikiCharacter.RoleType.ANTAGONIST);
            villain.setAge("千年老怪");
            villain.setGender("男");
            villain.setAppearance("血衣红发，气势滔天");
            villain.setPersonality("冷酷无情，追求力量");
            characterRepository.save(villain);

            System.out.println("✅ 创建 3 个角色档案");

            // 10. 创建时间线
            StoryWikiTimelineEvent event1 = new StoryWikiTimelineEvent(story, "故事开始", "主角被检测出灵根");
            event1.setEventTime("天历 3024 年春");
            event1.setSortOrder(1);
            timelineEventRepository.save(event1);

            StoryWikiTimelineEvent event2 = new StoryWikiTimelineEvent(story, "宗门大比", "三年一度的大比开始");
            event2.setEventTime("天历 3027 年秋");
            event2.setSortOrder(2);
            timelineEventRepository.save(event2);

            StoryWikiTimelineEvent event3 = new StoryWikiTimelineEvent(story, "命运抉择", "主角面临人生重大选择");
            event3.setEventTime("天历 3027 年冬");
            event3.setSortOrder(3);
            timelineEventRepository.save(event3);

            StoryWikiTimelineEvent event4 = new StoryWikiTimelineEvent(story, "结局", "不同线的结局");
            event4.setEventTime("天历 3127 年");
            event4.setSortOrder(4);
            timelineEventRepository.save(event4);

            System.out.println("✅ 创建 4 个时间线事件");

            System.out.println("\n🎉 测试数据初始化完成！");
            System.out.println("📖 小说：《修仙世界的多重结局》");
            System.out.println("👤 作者：author / 密码：123456");
            System.out.println("🌟 其他用户：zhangsan, lisi, wangwu / 密码：123456");
            System.out.println("📊 共 11 章（主线 5 章 + 分支 6 章）");
            System.out.println("🌳 3 条分支线");
            System.out.println("📚 Wiki：2 页面 + 3 角色 + 4 事件");
        };
    }

    private StoryChapter createChapter(Story story, User author, StoryChapter parent,
                                       int sortOrder, String title, String content, boolean isMainline,
                                       StoryChapterRepository chapterRepository) {
        StoryChapter chapter;
        if (parent == null) {
            chapter = new StoryChapter(story, author, sortOrder, title, content);
        } else {
            chapter = StoryChapter.createBranch(story, parent, author, sortOrder, title, content);
        }
        chapter.setIsMainline(isMainline);
        return chapterRepository.save(chapter);
    }
}
