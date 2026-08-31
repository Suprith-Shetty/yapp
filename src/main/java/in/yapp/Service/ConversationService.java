package in.yapp.Service;

import in.yapp.DTO.ConversationListDTO;
import in.yapp.Entity.Conversation;
import in.yapp.Entity.ConversationMember;
import in.yapp.Entity.ConversationType;
import in.yapp.Entity.User;
import in.yapp.Repository.ConversationMemberRepository;
import in.yapp.Repository.ConversationRepository;
import in.yapp.Repository.MessageRespository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.UnknownServiceException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationService
{

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageRespository messageRespository;

    public Conversation findorCreateDirectConversation(
            User user1,
            User user2){

        return conversationMemberRepository.findDirectConversation(
                user1.getId(),
                user2.getId()
        ).orElseGet(() -> {

            Conversation conversation = new Conversation();

            conversation.setType(ConversationType.DIRECT);

            conversation.setCreatedAt(Instant.now());

            conversationRepository.save(conversation);

            ConversationMember member1 = new ConversationMember();
            member1.setConversation(conversation);
            member1.setUser(user1);
            member1.setLastReadAt(Instant.now());


            ConversationMember member2 = new ConversationMember();
            member2.setConversation(conversation);
            member2.setUser(user2);
            member2.setLastReadAt(Instant.now());

            conversationMemberRepository.save(member1);
            conversationMemberRepository.save(member2);

            return conversation;
        });
    }

    public List<ConversationListDTO> getConversationList(UUID userId) {

        List<ConversationMember> memberships =
                conversationMemberRepository.findByUserId(userId);

        List<ConversationListDTO> conversations = new ArrayList<>();

        for (ConversationMember membership : memberships) {

            Conversation conversation = membership.getConversation();

            List<ConversationMember> members =
                    conversationMemberRepository.findByConversationId(conversation.getId());

            User otherUser = members.stream()
                    .map(ConversationMember::getUser)
                    .filter(user -> !user.getId().equals(userId))
                    .findFirst()
                    .orElse(null);

            if (otherUser == null) {
                continue;
            }

            var lastMessage =
                    messageRespository
                            .findTopByConversationIdOrderByCreatedAtDesc(
                                    conversation.getId()
                            );

            long unreadCount = getUnreadCount(
                    conversation.getId(),
                    userId
            );

            conversations.add(
                    new ConversationListDTO(
                            conversation.getId(),
                            otherUser.getId(),
                            otherUser.getUserName(),
                            otherUser.getDisplayName(),
                            lastMessage.map(message -> message.getContent()).orElse(null),
                            lastMessage.map(message -> message.getCreatedAt()).orElse(null),
                            unreadCount
                    )
            );
        }

        conversations.sort((a, b) -> {

            if (a.getLastMessageAt() == null) {
                return 1;
            }

            if (b.getLastMessageAt() == null) {
                return -1;
            }

            return b.getLastMessageAt().compareTo(a.getLastMessageAt());
        });

        return conversations;
    }



    public long getUnreadCount(UUID conversationId, UUID userId) {

        ConversationMember member =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                userId
                        )
                        .orElseThrow();

        Instant lastReadAt = member.getLastReadAt();

        if (lastReadAt == null) {
            return messageRespository
                    .countByConversationIdAndSenderIdNot(
                            conversationId,
                            userId
                    );
        }

        return messageRespository
                .countByConversationIdAndCreatedAtAfterAndSenderIdNot(
                        conversationId,
                        lastReadAt,
                        userId
                );
    }
    public void markAsRead(UUID conversationId, UUID userId) {

        ConversationMember member =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                userId
                        )
                        .orElseThrow();

        member.setLastReadAt(Instant.now());

        conversationMemberRepository.save(member);
    }

}