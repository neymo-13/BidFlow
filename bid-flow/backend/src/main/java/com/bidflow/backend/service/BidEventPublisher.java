package com.bidflow.backend.service;

import com.bidflow.backend.dto.BidEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class BidEventPublisher {

    private final SimpMessagingTemplate messagingTemplate; // เครื่องมือส่ง message ผ่าน WebSocket

    public void publishBidPlaced(BidEvent event) {
        String destination = "/topic/auctions/" + event.auctionId();
        messagingTemplate.convertAndSend(destination, event);
        log.info("Broadcast BID_PLACED to {} — bidder={}, amount={}, seq={}",
                destination,
                event.bidderUsername(),
                event.amount(),
                event.sequence());
    }

	public void publishAuctionEnded(BidEvent event) {
		String destination = "/topic/auctions/" + event.auctionId();
		messagingTemplate.convertAndSend(destination, event);
		log.info("Broadcast AUCTION_ENDED for auction {} — winner={}, amount={}",
				event.auctionId(),
				event.bidderUsername(),
				event.amount());
	}
}
