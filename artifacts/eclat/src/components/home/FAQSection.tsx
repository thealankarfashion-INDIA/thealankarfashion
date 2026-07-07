import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FAQ_ITEMS } from '@/lib/mock-data';

export default function FAQSection() {
  return (
    <section className="py-20 bg-[#FBF6F3]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-[0.25em] uppercase text-[#8E5E4F]/50 mb-3">Questions</div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-12 bg-[#E8D8D1]" />
            <h2 className="font-serif text-3xl md:text-4xl text-[#8E5E4F]">Frequently Asked Questions</h2>
            <div className="h-px w-12 bg-[#E8D8D1]" />
          </div>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-[#E8D8D1] rounded-sm px-6 bg-white">
              <AccordionTrigger className="font-serif text-sm text-[#8E5E4F] py-5 hover:text-[#B47A67] hover:no-underline text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[#8E5E4F]/60 leading-relaxed pb-5">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
