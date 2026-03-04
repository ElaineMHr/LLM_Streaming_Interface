const items = ["Hello world", "My first Chat", "Just another Chat"];

export default function Sidebar() {
  return (
    <div className="border-r-2 pt-2 min-h-screen bg-white">
      {items.map((item, idx) => (
        <div className="h-8 font-semibold border-b p-2 mb-2" key={idx}>
          {item}
        </div>
      ))}
    </div>
  );
}
